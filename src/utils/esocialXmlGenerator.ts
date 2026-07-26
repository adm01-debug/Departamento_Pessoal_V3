/**
 * Gerador de XML para o eSocial
 * Gera a estrutura básica seguindo os esquemas XSD do governo
 */

export interface ESocialXmlParams {
  tipo: string;
  dados: any;
  empresa: any;
  ambiente?: '1' | '2'; // 1-Produção, 2-Produção Restrita (Testes)
}

export function gerarXmlESocial({ tipo, dados, empresa, ambiente = '2' }: ESocialXmlParams): string {
  const now = new Date().toISOString();
  const id = `ID1${empresa.cnpj.replace(/\D/g, '').padStart(14, '0')}${now.replace(/[-T:.Z]/g, '').slice(0, 14)}`;
  
  let content: string;

  switch (tipo) {
    case 'S-1000':
      content = generateS1000(id, dados, empresa, ambiente);
      break;
    case 'S-2200':
      content = generateS2200(id, dados, empresa, ambiente);
      break;
    default:
      content = generateGeneric(id, tipo, dados, empresa, ambiente);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/${tipo.toLowerCase()}/v_S_01_02_00">
  ${content}
</eSocial>`;
}

function generateS1000(id: string, dados: any, empresa: any, ambiente: string) {
  return `
  <evtInfoEmpregador Id="${id}">
    <ideEvento>
      <tpAmb>${ambiente}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${empresa.cnpj.replace(/\D/g, '')}</nrInsc>
    </ideEmpregador>
    <infoEmpregador>
      <inclusao>
        <idePeriodo>
          <iniValid>${dados.iniValid || '2023-01'}</iniValid>
        </idePeriodo>
        <infoCadastro>
          <nmRazao>${empresa.razao_social}</nmRazao>
          <classTrib>${dados.classTrib || '01'}</classTrib>
          <natJurid>${dados.natJurid || '2062'}</natJurid>
          <indCoop>${dados.indCoop || '0'}</indCoop>
          <indConstr>${dados.indConstr || '0'}</indConstr>
          <indDesFolha>${dados.indDesFolha || '0'}</indDesFolha>
          <indOptRegEletron>${dados.indOptRegEletron || '1'}</indOptRegEletron>
          <indEntidadeEducacional>${dados.indEntidadeEducacional || 'N'}</indEntidadeEducacional>
          <indEtt>${dados.indEtt || 'N'}</indEtt>
          <contato>
            <nmContato>${dados.contato?.nome || empresa.nome_fantasia}</nmContato>
            <cpfContato>${dados.contato?.cpf || '00000000000'}</cpfContato>
            <foneFixo>${empresa.telefone || ''}</foneFixo>
            <email>${empresa.email || ''}</email>
          </contato>
        </infoCadastro>
      </inclusao>
    </infoEmpregador>
  </evtInfoEmpregador>`;
}

function generateS2200(id: string, dados: any, empresa: any, ambiente: string) {
  return `
  <evtAdmissao Id="${id}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${ambiente}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${empresa.cnpj.replace(/\D/g, '')}</nrInsc>
    </ideEmpregador>
    <trabalhador>
      <cpfTrab>${dados.cpfTrab.replace(/\D/g, '')}</cpfTrab>
      <nmTrab>${dados.nmTrab}</nmTrab>
      <sexo>${dados.sexo || 'M'}</sexo>
      <racaCor>${dados.racaCor || '1'}</racaCor>
      <estCiv>${dados.estCiv || '1'}</estCiv>
      <grauInstr>${dados.grauInstr || '07'}</grauInstr>
      <nascimento>
        <dtNascto>${dados.dtNascto}</dtNascto>
        <paisNascto>105</paisNascto>
        <paisNac>105</paisNac>
      </nascimento>
    </trabalhador>
    <vinculo>
      <matricula>${dados.matricula || 'MAT' + Date.now()}</matricula>
      <tpRegTrab>${dados.tpRegTrab || '1'}</tpRegTrab>
      <tpRegPrev>${dados.tpRegPrev || '1'}</tpRegPrev>
      <infoRegimeTrab>
        <infoEstatutario>
          <indPlanoRP>2</indPlanoRP>
        </infoEstatutario>
      </infoRegimeTrab>
      <infoContrato>
        <codCargo>${dados.codCargo}</codCargo>
        <vlrSalFx>${dados.vrSalFx}</vlrSalFx>
        <undSalFixo>1</undSalFixo>
        <tpContr>1</tpContr>
        <dtAdm>${dados.dtAdm}</dtAdm>
      </infoContrato>
    </vinculo>
  </evtAdmissao>`;
}

function generateGeneric(id: string, _tipo: string, dados: any, empresa: any, ambiente: string) {
  return `
  <evento Id="${id}">
    <ideEvento>
      <tpAmb>${ambiente}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${empresa.cnpj.replace(/\D/g, '')}</nrInsc>
    </ideEmpregador>
    <dados>
      ${JSON.stringify(dados)}
    </dados>
  </evento>`;
}
