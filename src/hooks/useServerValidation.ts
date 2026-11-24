import { FieldValues, UseFormSetError, Path } from 'react-hook-form';
import { toast } from 'sonner';

interface ValidationErrorField {
  field: string;
  message: string;
}

interface ServerErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: ValidationErrorField[];
  };
}

export function useServerValidation<T extends FieldValues>() {
  const handleServerError = (error: any, setError?: UseFormSetError<T>) => {
    // Check if it's a standard error response from our contract
    const serverError = error?.response?.data || error?.data || error;
    
    const errorCode = serverError?.error?.code;
    const errorMessage = serverError?.error?.message || serverError?.message || 'Ocorreu um erro inesperado.';

    // 1. Validation Errors (422)
    if (errorCode === 'VALIDATION_ERROR' && serverError.error.fields && setError) {
      serverError.error.fields.forEach((err: ValidationErrorField) => {
        setError(err.field as Path<T>, {
          type: 'server',
          message: err.message,
        });
      });
      
      toast.error('Verifique os campos destacados no formulário.');
      return true;
    }

    // 2. Timeout Errors (504)
    if (errorCode === 'TIMEOUT_ERROR' || error?.status === 504) {
      toast.error('O servidor demorou muito para responder. Tente novamente em alguns instantes.', {
        action: {
          label: 'Ver Status',
          onClick: () => window.location.href = '/settings/system-health'
        }
      });
      return true;
    }

    // 3. Security/Auth Errors (401/403)
    if (error?.status === 401 || error?.status === 403) {
      toast.error('Sessão expirada ou sem permissão. Por favor, faça login novamente.');
      return true;
    }

    // Fallback for other errors
    toast.error(errorMessage);
    return false;
  };

  return { handleServerError };
}

