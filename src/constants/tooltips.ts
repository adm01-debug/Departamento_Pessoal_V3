/**
 * Textos de todos os tooltips informativos do dashboard, centralizados para
 * facilitar manutenção/tradução.
 */
export const dashboardTooltips = {
  header: {
    latencia:
      'Tempo de resposta (ping) entre o app e o banco de dados. Acima de 500ms é considerado alto e pode deixar telas e buscas mais lentas.',
    sincronizar:
      'Atualiza os dados do dashboard com as informações mais recentes do banco, sem recarregar a página.',
    exportar:
      'Gera um arquivo (PDF ou Excel) com os dados exibidos no dashboard para download ou compartilhamento.',
    acoesRapidas:
      'Atalhos para as ações mais comuns do dia a dia do Departamento Pessoal (admissão, férias, ponto etc.).',
    notificacoes: 'Ver notificações.',
    perfilUsuario: 'Configurações da conta.',
  },

  kpis: {
    colaboradoresAtivos:
      'Total de colaboradores com contrato ativo hoje. A variação compara esse total com o mesmo dia do mês anterior.',
    folhaMensal:
      'Custo total da folha do mês, somando salários, benefícios e encargos (INSS, FGTS etc.).',
    feriasPendentes:
      'Colaboradores com férias a vencer nos próximos 30 dias e que ainda não têm período de férias agendado.',
    bancoDeHoras:
      'Saldo consolidado do banco de horas de todos os colaboradores: positivo (+) é saldo credor (horas a compensar pela empresa), negativo é saldo devedor.',
    pendencias:
      'Soma de itens que aguardam alguma ação: documentos pendentes, aprovações de férias/ponto, exames vencendo e cadastros incompletos.',
  },

  charts: {
    legendaColaboradores: 'Total de colaboradores ativos ao final de cada mês.',
    legendaAdmissoes: 'Quantidade de novos contratos iniciados no mês.',
    legendaDemissoes: 'Quantidade de contratos encerrados (desligamentos) no mês.',
    periodoSelector: 'Define o intervalo de meses exibido no gráfico de evolução.',
    departamento: (nome: string, percentual: number) =>
      `${nome}: ${percentual}% do total de colaboradores ativos.`,
  },

  systemStatus: {
    bancoDeDados:
      'Tempo de resposta (em milissegundos) da última consulta ao banco de dados. Valores altos indicam lentidão na infraestrutura.',
    api: 'Tempo médio de resposta (em milissegundos) das chamadas às funções de backend (Edge Functions) nos últimos minutos.',
    taxaSucesso:
      'Percentual de chamadas às funções de backend que terminaram sem erro nos últimos minutos. Abaixo de 90% indica instabilidade.',
    falhasRecentes:
      'Número de chamadas às funções de backend que retornaram erro recentemente.',
    acoes: {
      alertasDp:
        'Dispara manualmente os alertas de Departamento Pessoal (férias vencendo, documentos pendentes etc.) para os responsáveis.',
      limparCache:
        'Invalida o cache do sistema, forçando os dados a serem recarregados na próxima consulta.',
      limpeza:
        'Executa a rotina de limpeza de dados temporários/expirados do sistema.',
      saude:
        'Executa uma verificação de integridade (healthcheck) da infraestrutura.',
    },
  },

  widgets: {
    passivoTrabalhista: {
      valor:
        'Estimativa de valor que a empresa deveria ter provisionado para cobrir obrigações trabalhistas futuras (férias, 13º, rescisões), calculada com base no histórico de folha e nos saldos em aberto.',
      provisionamento:
        'Percentual do passivo estimado que já está provisionado/reservado. A meta é chegar a 100% para cobrir totalmente o risco.',
    },
    movimentacao: {
      headcount: 'Headcount: número total de colaboradores ativos na empresa neste momento.',
      admissoes: 'Quantidade de colaboradores admitidos neste mês.',
      desligamentos: 'Quantidade de colaboradores desligados neste mês.',
    },
    acoesDestaque: {
      feriasPendentes:
        'Colaboradores com direito a férias que ainda não têm período agendado.',
      afastamentos:
        'Colaboradores atualmente afastados (atestado médico, licença etc.) e que ainda não retornaram.',
      admissoesEmCurso:
        'Processos de admissão iniciados que ainda não foram concluídos (documentação, exames ou cadastro pendentes).',
    },
    proximosEventos: {
      admissoesPrevistas:
        'Colaboradores com data de início prevista para hoje ou nos próximos dias — confirme documentação e acessos com antecedência.',
      examesVencendo:
        'Exames ocupacionais (admissional, periódico ou demissional) próximos do vencimento — agendar para evitar não conformidade.',
    },
    resumoOperacional: {
      colaboradoresPresentes:
        'Colaboradores com ponto batido hoje em relação ao total de colaboradores ativos esperados no expediente.',
      processosAndamento:
        'Processos de DP em aberto no momento (admissões, desligamentos, férias, afastamentos etc. ainda não concluídos).',
      documentosPendentes:
        'Documentos obrigatórios (contratuais, exames, certidões) que ainda faltam ser enviados ou aprovados.',
      tarefasDoDia: 'Tarefas atribuídas ao time de DP com prazo para hoje.',
    },
  },

  /** Dashboard Executivo (`DashboardExecutivoPage`) — textos fornecidos pelo time. */
  dashboardExecutivo: {
    kpis: {
      headcount: 'Total de colaboradores ativos no período, incluindo CLT, PJ e estagiários.',
      folhaMensal: 'Composição: Salários base + Benefícios + Encargos (FGTS, INSS, 13º provisionado).',
      turnover: 'Taxa de rotatividade calculada sobre a média do headcount dos últimos 12 meses.',
      absenteismo: 'Percentual de ausências não planejadas: faltas, atrasos e licenças médicas curtas.',
      pendencias: 'Breakdown: [ver no card de Ações em Destaque]',
    },
    // Auditoria de ruído visual (2026): tooltips que só explicavam conceitos universais de
    // RH (admissões/desligamentos/saldo, bruto/líquido, 13º/INSS/FGTS etc.) foram removidos —
    // o público desta página é profissional de RH experiente, que já conhece esses termos.
    // Sobrevivem só os tooltips com dado calculado/threshold de negócio específico deste
    // dashboard (meta, tendência classificada, contagem dinâmica) — não recriar os removidos
    // sem alinhar de novo.
    evolucao: {
      verAnaliseCompleta: 'Abre a análise detalhada com todos os insights do período, incluindo histórico e comparativos.',
    },
    turnoverPeriodo: {
      meta: 'Meta anual definida pelo RH para 2026: máximo de 3% de turnover.',
    },
    insights: {
      feriasPendentes: "São 18 solicitações de férias aguardando aprovação. Clique em 'Ver análise completa' para ver a lista.",
    },
    custos: {
      tendencia: "Classificação baseada em variação entre 5% e 15% no período. Acima de 15% é considerada 'tendência alta'.",
      feriasVencendo: (count: number) => `${count} colaborador${count !== 1 ? 'es' : ''} com férias vencendo nos próximos 30 dias. Clique em 'Ver análise completa' para ver a lista com nomes e datas exatas.`,
    },
    // Somente os 2 tooltips considerados essenciais (dado calculado/thresholds de negócio,
    // não conceito universal de RH que o público-alvo — profissional de RH experiente — já
    // conhece) sobrevivem aqui; os ~28 explicativos de conceitos básicos (CLT/PJ, Júnior/
    // Pleno/Sênior, faixas de amplitude, tempo de casa etc.) foram removidos por decisão de
    // produto (ruído visual para esse público) — não recriar sem alinhar de novo.
    estrutura: {
      amplitudeLideranca: 'Média de colaboradores por liderança. Valores acima de 15 podem indicar sobrecarga de gestão. Benchmark de mercado: entre 6 e 10.',
      alertaAmplitude: (count: number) =>
        `${count === 1 ? 'Líder' : 'Líderes'} com mais de 15 colaboradores diretos, acima do limite recomendado pela literatura de gestão.`,
    },
    // Só os 3 tooltips com regra/threshold de negócio próprio deste dashboard
    // sobrevivem aqui — o restante da aba (Orçamento anual, Forecast, Realizado,
    // Desvio, legendas do gráfico, Impacto mensal/anualizado, contadores do
    // Plano de Pessoas, insights do rodapé, nome dos departamentos) não leva
    // tooltip: são valores/rótulos autoexplicativos para o público (RH
    // experiente). Não recriar sem alinhar de novo.
    estrategia: {
      desvioProjetado:
        'Projeção de fechamento vs. orçamento anual aprovado. Desvios acima de ±5% exigem revisão do plano orçamentário.',
      custoPessoalReceita:
        'Indicador de eficiência: quanto da receita é consumido pela folha. Meta definida pela diretoria para 2026: máximo de 45%. Valores acima indicam necessidade de revisão do quadro ou da política salarial.',
      statusAderencia:
        "Classificação automática: 'Dentro' (variação ≤ 5%), 'Atenção' (5% a 10%), 'Acima' (> 10%).",
    },
    // Diferente das outras abas: aqui os 8 tooltips sobrevivem mesmo para o público
    // experiente porque a aba lida com regras de negócio específicas deste sistema
    // (SLA, provisionamento, classificação de risco/severidade) — não conceitos
    // universais de RH. Não recriar sem alinhar de novo.
    analiseDetalhada: {
      provisionamento:
        'Percentual provisionado sobre o valor total estimado de risco. Abaixo de 70% é crítico, entre 70-90% é atenção, acima de 90% é adequado.',
      altoRisco:
        'Processos classificados como alto risco pela matriz de probabilidade x impacto. Requerem acompanhamento jurídico prioritário.',
      aceitacaoEsocial:
        'Percentual de eventos aceitos pelo eSocial sem rejeição. Meta: acima de 95%. Abaixo disso, revisar integridade dos dados de origem.',
      certificadoEsocial:
        'Dias restantes até o vencimento do certificado digital A1. Renovação deve ser iniciada com 30 dias de antecedência.',
      slaPendencias:
        'Prazo máximo recomendado para resolução de cada categoria. Acima do SLA, o item é classificado como crítico.',
      statusPendencias:
        "Classificação automática: 'Crítico' (SLA excedido), 'Atenção' (próximo do vencimento), 'OK' (dentro do prazo).",
      severidade:
        "Classificação por severidade e impacto: 'Crítico' (ação imediata), 'Alto' (ação em 24-48h), 'Atenção' (monitorar).",
      origemEvento:
        "Origem da alteração: nome do usuário (ação manual) ou 'Sistema' (ação automática/integração).",
    },
  },

  auditLog: {
    insert: 'Um novo registro foi criado nesta tabela.',
    update: 'Um registro existente foi alterado nesta tabela.',
    delete: 'Um registro foi removido desta tabela.',
    alertaPortaria671:
      'Alerta da Portaria 671/2021 (MTP): regras de controle eletrônico de ponto, como batidas fora do perímetro autorizado (geofencing) ou fora do fuso horário esperado.',
  },
} as const;
