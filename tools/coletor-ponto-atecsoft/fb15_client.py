"""
Cliente Firebird 1.5 somente leitura, via ctypes + gds32.dll (protocolo local).

O Ponto AtecSoft grava em Firebird 1.5 (ODS 10.1) e traz a própria gds32.dll de
32 bits; nenhuma biblioteca Firebird atual abre esse banco. Este módulo fala
direto com a DLL e só abre transações READ ONLY (isc_tpb_read): não há caminho
de escrita aqui.

Exige Python de 32 bits no Windows. Usuário e senha vêm de quem chama; nada
fica fixo neste arquivo.
"""

import ctypes
import ctypes.wintypes
import struct
from datetime import date, time, datetime, timedelta

# ─── Constants ───

SQLDA_VERSION1 = 1
SQL_DIALECT_V6 = 3

SQL_TEXT = 452
SQL_VARYING = 448
SQL_SHORT = 500
SQL_LONG = 496
SQL_FLOAT = 482
SQL_DOUBLE = 480
SQL_TIMESTAMP = 510
SQL_TYPE_TIME = 560
SQL_TYPE_DATE = 570
SQL_INT64 = 580
SQL_BLOB = 520

isc_dpb_version1 = 1
isc_dpb_user_name = 28
isc_dpb_password = 29

isc_tpb_version3 = 3
isc_tpb_read = 8
isc_tpb_read_committed = 15
isc_tpb_rec_version = 17

DSQL_close = 1
DSQL_drop = 2

ISC_STATUS_LENGTH = 20
FETCH_OK = 0
FETCH_EOF = 100

FB_EPOCH = date(1858, 11, 17)

# ─── Types ───

ISC_STATUS_ARRAY = ctypes.c_long * ISC_STATUS_LENGTH
ISC_LONG = ctypes.c_long
ISC_SHORT = ctypes.c_short


class ISC_TEB(ctypes.Structure):
    """Transaction Existence Block para isc_start_multiple."""
    _fields_ = [
        ('db_handle', ctypes.POINTER(ISC_LONG)),
        ('tpb_length', ctypes.c_int),
        ('tpb', ctypes.c_char_p),
    ]


class XSQLVAR(ctypes.Structure):
    _fields_ = [
        ('sqltype', ISC_SHORT),
        ('sqlscale', ISC_SHORT),
        ('sqlsubtype', ISC_SHORT),
        ('sqllen', ISC_SHORT),
        ('sqldata', ctypes.c_void_p),  # c_void_p em vez de c_char_p
        ('sqlind', ctypes.POINTER(ISC_SHORT)),
        ('sqlname_length', ISC_SHORT),
        ('sqlname', ctypes.c_char * 32),
        ('relname_length', ISC_SHORT),
        ('relname', ctypes.c_char * 32),
        ('ownname_length', ISC_SHORT),
        ('ownname', ctypes.c_char * 32),
        ('aliasname_length', ISC_SHORT),
        ('aliasname', ctypes.c_char * 32),
    ]


def make_xsqlda(n):
    class XSQLDA_N(ctypes.Structure):
        _fields_ = [
            ('version', ISC_SHORT),
            ('sqldaid', ctypes.c_char * 8),
            ('sqldabc', ISC_LONG),
            ('sqln', ISC_SHORT),
            ('sqld', ISC_SHORT),
            ('sqlvar', XSQLVAR * n),
        ]
    da = XSQLDA_N()
    da.version = SQLDA_VERSION1
    da.sqln = n
    da.sqld = 0
    da.sqldabc = ctypes.sizeof(da)
    return da


# ─── DPB ───

def build_dpb(user, password):
    dpb = bytearray([isc_dpb_version1])
    ub = user.encode('ascii')
    dpb.append(isc_dpb_user_name)
    dpb.append(len(ub))
    dpb.extend(ub)
    pb = password.encode('ascii')
    dpb.append(isc_dpb_password)
    dpb.append(len(pb))
    dpb.extend(pb)
    return bytes(dpb)


# ─── Data conversion ───

def decode_date(raw_bytes):
    days = struct.unpack('<i', raw_bytes[:4])[0]
    try:
        return FB_EPOCH + timedelta(days=days)
    except (OverflowError, ValueError):
        return None


def decode_time(raw_bytes):
    ticks = struct.unpack('<I', raw_bytes[:4])[0]
    total_sec = ticks // 10000
    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60
    try:
        return time(h, m, s)
    except ValueError:
        return None


def decode_timestamp(raw_bytes):
    d = decode_date(raw_bytes[:4])
    t = decode_time(raw_bytes[4:8])
    if d and t:
        return datetime.combine(d, t)
    return None


def encode_date(d):
    if isinstance(d, datetime):
        d = d.date()
    days = (d - FB_EPOCH).days
    return struct.pack('<i', days)


# ─── Client ───

class Fb15Connection:

    def __init__(self, database, user, password, lib_path=None):
        self.database = database
        self.user = user
        self.password = password
        self.closed = False
        self._buffers = []  # manter referências vivas

        if lib_path:
            self._lib = ctypes.WinDLL(lib_path)
        else:
            self._lib = ctypes.WinDLL('gds32.dll')

        self._setup_functions()

        # Conecta via protocolo local
        self._db_handle = ISC_LONG(0)
        self._status = ISC_STATUS_ARRAY()

        dpb = build_dpb(user, password)
        db_name = database.encode('ascii')

        self._isc_attach_database(
            self._status, len(db_name), db_name,
            ctypes.byref(self._db_handle), len(dpb), dpb
        )
        self._check_status("attach_database")

    def _setup_functions(self):
        lib = self._lib
        self._isc_attach_database = lib.isc_attach_database
        self._isc_detach_database = lib.isc_detach_database
        self._isc_start_multiple = lib.isc_start_multiple
        self._isc_commit_transaction = lib.isc_commit_transaction
        self._isc_rollback_transaction = lib.isc_rollback_transaction
        self._isc_dsql_allocate_statement = lib.isc_dsql_allocate_statement
        self._isc_dsql_prepare = lib.isc_dsql_prepare
        self._isc_dsql_describe = lib.isc_dsql_describe
        self._isc_dsql_execute = lib.isc_dsql_execute
        self._isc_dsql_fetch = lib.isc_dsql_fetch
        self._isc_dsql_free_statement = lib.isc_dsql_free_statement
        self._isc_interprete = lib.isc_interprete
        self._isc_sqlcode = lib.isc_sqlcode

    def _check_status(self, context=""):
        if self._status[0] == 1 and self._status[1] != 0:
            raise Exception(f"Firebird {context}: {self._get_error()}")

    def _get_error(self):
        buf = ctypes.create_string_buffer(512)
        status_ptr = ctypes.cast(self._status, ctypes.POINTER(ISC_LONG))
        pp = ctypes.pointer(status_ptr)
        msgs = []
        for _ in range(5):
            ret = self._isc_interprete(buf, pp)
            if ret == 0:
                break
            msg = buf.value.decode('latin-1', errors='replace').strip()
            if msg:
                msgs.append(msg)
        return ' | '.join(msgs) if msgs else 'Unknown error'

    def _start_read_transaction(self):
        """Inicia transação read-only usando isc_start_multiple (não variadic)."""
        tr_handle = ISC_LONG(0)
        tpb = bytes([isc_tpb_version3, isc_tpb_read, isc_tpb_read_committed, isc_tpb_rec_version])

        teb = ISC_TEB()
        teb.db_handle = ctypes.pointer(self._db_handle)
        teb.tpb_length = len(tpb)
        teb.tpb = tpb

        self._isc_start_multiple(
            self._status,
            ctypes.byref(tr_handle),
            1,  # count = 1 database
            ctypes.byref(teb)
        )
        self._check_status("start_transaction")
        return tr_handle

    def execute(self, sql, params=None):
        tr_handle = self._start_read_transaction()
        try:
            result = self._execute_in_transaction(sql, params, tr_handle)
            self._isc_commit_transaction(self._status, ctypes.byref(tr_handle))
            return result
        except Exception:
            self._isc_rollback_transaction(self._status, ctypes.byref(tr_handle))
            raise

    def _execute_in_transaction(self, sql, params, tr_handle):
        stmt_handle = ISC_LONG(0)
        self._isc_dsql_allocate_statement(
            self._status, ctypes.byref(self._db_handle), ctypes.byref(stmt_handle)
        )
        self._check_status("allocate_statement")

        try:
            out_da = make_xsqlda(50)
            sql_bytes = sql.encode('ascii')

            self._isc_dsql_prepare(
                self._status, ctypes.byref(tr_handle), ctypes.byref(stmt_handle),
                len(sql_bytes), sql_bytes, SQL_DIALECT_V6, ctypes.byref(out_da)
            )
            self._check_status("prepare")

            num_cols = out_da.sqld
            if num_cols == 0:
                return []

            if num_cols > out_da.sqln:
                out_da = make_xsqlda(num_cols)
                self._isc_dsql_describe(
                    self._status, ctypes.byref(stmt_handle),
                    SQL_DIALECT_V6, ctypes.byref(out_da)
                )
                self._check_status("describe")

            col_info, data_bufs, ind_bufs = self._allocate_output_buffers(out_da, num_cols)

            # Input params
            in_da_ptr = None
            if params:
                in_da, in_refs = self._build_input_sqlda(params)
                in_da_ptr = ctypes.byref(in_da)

            self._isc_dsql_execute(
                self._status, ctypes.byref(tr_handle), ctypes.byref(stmt_handle),
                SQL_DIALECT_V6, in_da_ptr
            )
            self._check_status("execute")

            # Fetch
            rows = []
            while True:
                fetch_status = self._isc_dsql_fetch(
                    self._status, ctypes.byref(stmt_handle),
                    SQL_DIALECT_V6, ctypes.byref(out_da)
                )
                if fetch_status == FETCH_EOF or fetch_status != FETCH_OK:
                    break

                row = {}
                for i, (name, sqltype, sqllen, scale) in enumerate(col_info):
                    if ind_bufs[i].value == -1:
                        row[name] = None
                        continue
                    raw = ctypes.string_at(data_bufs[i], max(sqllen + 2, 8))
                    row[name] = self._decode_value(raw, sqltype, sqllen, scale)
                rows.append(row)

            return rows
        finally:
            self._isc_dsql_free_statement(
                self._status, ctypes.byref(stmt_handle), DSQL_drop
            )

    def _allocate_output_buffers(self, out_da, num_cols):
        col_info = []
        data_bufs = []
        ind_bufs = []

        for i in range(num_cols):
            var = out_da.sqlvar[i]
            name = var.aliasname[:var.aliasname_length].decode('ascii', errors='replace').lower()
            sqltype = var.sqltype & ~1
            sqllen = var.sqllen
            scale = var.sqlscale

            if sqltype == SQL_VARYING:
                buf_size = sqllen + 2
            elif sqltype in (SQL_TYPE_DATE, SQL_LONG, SQL_FLOAT):
                buf_size = 4
            elif sqltype in (SQL_TYPE_TIME,):
                buf_size = 4
            elif sqltype in (SQL_INT64, SQL_DOUBLE, SQL_TIMESTAMP, SQL_BLOB):
                buf_size = 8
            elif sqltype == SQL_SHORT:
                buf_size = 2
            elif sqltype == SQL_TEXT:
                buf_size = sqllen
            else:
                buf_size = max(sqllen, 256)

            buf_size = max(buf_size, 8)  # mínimo 8 bytes
            data_buf = ctypes.create_string_buffer(buf_size)
            ind_buf = ISC_SHORT(0)

            out_da.sqlvar[i].sqldata = ctypes.cast(data_buf, ctypes.c_void_p).value
            out_da.sqlvar[i].sqlind = ctypes.pointer(ind_buf)

            col_info.append((name, sqltype, sqllen, scale))
            data_bufs.append(ctypes.cast(data_buf, ctypes.c_void_p).value)
            ind_bufs.append(ind_buf)

        return col_info, data_bufs, ind_bufs

    def _build_input_sqlda(self, params):
        """Constroi XSQLDA de entrada. Retorna (sqlda, refs) onde refs mantém buffers vivos."""
        n = len(params)
        in_da = make_xsqlda(n)
        in_da.sqld = n
        refs = []  # manter referências vivas para GC não limpar

        for i, val in enumerate(params):
            if isinstance(val, date):
                data_bytes = encode_date(val)
                buf = ctypes.create_string_buffer(data_bytes, len(data_bytes))
                in_da.sqlvar[i].sqltype = SQL_TYPE_DATE
                in_da.sqlvar[i].sqllen = 4
            elif isinstance(val, int):
                data_bytes = struct.pack('<i', val)
                buf = ctypes.create_string_buffer(data_bytes, 4)
                in_da.sqlvar[i].sqltype = SQL_LONG
                in_da.sqlvar[i].sqllen = 4
            elif isinstance(val, str):
                encoded = val.encode('latin-1', errors='replace')
                buf_data = struct.pack('<H', len(encoded)) + encoded
                buf = ctypes.create_string_buffer(buf_data, len(buf_data))
                in_da.sqlvar[i].sqltype = SQL_VARYING
                in_da.sqlvar[i].sqllen = len(encoded)
            else:
                encoded = str(val).encode('latin-1', errors='replace')
                buf_data = struct.pack('<H', len(encoded)) + encoded
                buf = ctypes.create_string_buffer(buf_data, len(buf_data))
                in_da.sqlvar[i].sqltype = SQL_VARYING
                in_da.sqlvar[i].sqllen = len(encoded)

            in_da.sqlvar[i].sqldata = ctypes.cast(buf, ctypes.c_void_p).value
            ind = ISC_SHORT(0)
            in_da.sqlvar[i].sqlind = ctypes.pointer(ind)
            in_da.sqlvar[i].sqlscale = 0
            refs.append((buf, ind))

        return in_da, refs

    def _decode_value(self, raw, sqltype, sqllen, scale):
        if sqltype == SQL_VARYING:
            length = struct.unpack('<H', raw[:2])[0]
            return raw[2:2+length].decode('latin-1', errors='replace')
        elif sqltype == SQL_TEXT:
            return raw[:sqllen].decode('latin-1', errors='replace').rstrip()
        elif sqltype == SQL_SHORT:
            val = struct.unpack('<h', raw[:2])[0]
            return val if scale == 0 else val / (10 ** -scale)
        elif sqltype == SQL_LONG:
            val = struct.unpack('<i', raw[:4])[0]
            return val if scale == 0 else val / (10 ** -scale)
        elif sqltype == SQL_INT64:
            val = struct.unpack('<q', raw[:8])[0]
            return val if scale == 0 else val / (10 ** -scale)
        elif sqltype == SQL_FLOAT:
            return struct.unpack('<f', raw[:4])[0]
        elif sqltype == SQL_DOUBLE:
            return struct.unpack('<d', raw[:8])[0]
        elif sqltype == SQL_TYPE_DATE:
            return decode_date(raw[:4])
        elif sqltype == SQL_TYPE_TIME:
            return decode_time(raw[:4])
        elif sqltype == SQL_TIMESTAMP:
            return decode_timestamp(raw[:8])
        elif sqltype == SQL_BLOB:
            return None
        else:
            return raw[:sqllen]

    def close(self):
        if not self.closed:
            status = ISC_STATUS_ARRAY()
            self._isc_detach_database(status, ctypes.byref(self._db_handle))
            self.closed = True

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass
