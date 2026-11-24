
/**
 * Utilitário para integração de dados de ponto eletrônico com a folha.
 */
export const pontoIntegracaoUtils = {
  /**
   * Converte um intervalo do PostgreSQL (HH:mm:ss) ou objeto para horas decimais.
   */
  intervalToDecimal: (interval: any): number => {
    if (!interval) return 0;
    
    // Se vier como string "HH:mm:ss"
    if (typeof interval === 'string') {
      const parts = interval.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
        return hours + (minutes / 60) + (seconds / 3600);
      }
    }
    
    // Se vier como objeto { hours, minutes, seconds }
    if (typeof interval === 'object') {
      const hours = interval.hours || 0;
      const minutes = interval.minutes || 0;
      const seconds = interval.seconds || 0;
      return hours + (minutes / 60) + (seconds / 3600);
    }
    
    return 0;
  }
};
