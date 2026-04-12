# RFC: Request for Comments — Projeto de Portfólio

**Engenharia de Software — Católica SC**

---

## Identificação

| Campo                            | Valor                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Título do Projeto**            | Geração Automatizada de Relatórios Clínicos Narrativos para Reabilitação Respiratória a partir de Logs do Exergame I Blue It |
| **Linha de Projeto (Direction)** | IA                                                                                                                                         |
| **Autor**                        | Jhessica Maria Alves Fernandes                                                                                                                          |
| **Data da Proposta**             | 12/04/2026                                                                                                                                 |
| **Versão**                       | 1.0                                                                                                                                        |

---

## 1. Visão do Produto e Impacto (O Problema)

### 1.1 Contexto e Problema

O **I Blue It** é um exergame para reabilitação respiratória desenvolvido por **Grimes et al.** na **UDESC (Universidade do Estado de Santa Catarina)** (Grimes et al., 2018). No jogo, o paciente sopra no microfone do dispositivo para controlar elementos visuais na tela — mecanismo que simultaneamente exercita a musculatura respiratória e estimula técnicas de limpeza das vias aéreas, abordagem clinicamente validada para pacientes com **DPOC** (Doença Pulmonar Obstrutiva Crônica) e **Fibrose Cística (FC)**. Este projeto de portfólio é desenvolvido no contexto do curso de Engenharia de Software da **Católica SC**, sob orientação do **Prof. Claudinei Dias**, pesquisador com pós-doutorado na UDESC e membro do grupo de pesquisa vinculado ao I Blue It.

A cada sessão, o sistema registra automaticamente um conjunto rico de dados de desempenho: intensidade média e máxima do sopro, tempo total de jogo, tempo efetivo de sopro, pontuação, frequência de uso semanal e respostas ao questionário de bem-estar. Esse volume de dados representa um acervo longitudinal valioso do comportamento respiratório e da evolução clínica de cada paciente.

O problema central é a **ausência de qualquer mecanismo que transforme esses dados em documentação clínica interpretável**. Atualmente:

- Os dados ficam armazenados em **arquivos de log brutos** (JSON/CSV), sem tratamento ou síntese;
- O fisioterapeuta responsável precisa acessar manualmente esses arquivos, interpretar as métricas numericamente e **redigir à mão** o relatório de evolução clínica do paciente;
- Não há padronização de formato, periodicidade ou completude entre os relatórios produzidos por diferentes profissionais.

**Consequências práticas dessa lacuna:**

- Tempo expressivo gasto em documentação manual — estimado em 30 a 45 minutos por semana por profissional — em detrimento do atendimento direto ao paciente;
- Qualidade e completude dos registros variam entre profissionais e ao longo do tempo;
- A maior parte dos dados coletados pelo jogo nunca é formalmente incorporada à documentação clínica;
- Impossibilidade de identificar, de forma rápida e padronizada, tendências de melhora ou deterioração no desempenho respiratório do paciente.

Vagg et al. (2018) demonstraram, em sistema similar desenvolvido para Fibrose Cística, que dados de desempenho em jogos sérios respiratórios correlacionam-se com indicadores clínicos relevantes — chegando a antecipar exacerbações antes de consultas presenciais. Esse potencial permanece **completamente inexplorado** no contexto do I Blue It pela ausência de uma camada de interpretação e documentação automatizada.

---

### 1.2 Origem da Demanda e Evidências

O projeto está vinculado ao **Grupo de Pesquisa em Reabilitação Respiratória da UDESC**, responsável pelo desenvolvimento e manutenção do exergame I Blue It (Grimes et al., 2018). A conexão com o grupo se dá por meio do **Prof. Claudinei Dias**, orientador deste projeto na Católica SC e pesquisador com pós-doutorado na UDESC, com publicações vinculadas ao I Blue It entre 2020 e 2024.

Foi realizada **1 entrevista** com pesquisador do grupo de pesquisa parceiro. As principais dores identificadas foram:

- Ausência de ferramenta que transforme os logs do I Blue It em documentação clínica estruturada;
- Fisioterapeutas que acompanham os pacientes relatam dificuldade em acessar e interpretar os dados brutos do jogo;
- Os dados coletados pelo sistema raramente são integrados aos registros clínicos formais por falta de tempo e ferramentas;
- Não há como visualizar rapidamente a evolução de um paciente ao longo de semanas sem consolidar manualmente múltiplos arquivos de log.

Como evidências concretas do interesse do parceiro:

- Publicações do grupo entre 2018–2024 mencionam **explicitamente** a necessidade de ferramentas de analytics e documentação para o I Blue It (Santos et al., 2020; Dias et al., 2020);
- O mapeamento sistemático realizado por Dias et al. (2020) identificou ausência de sistemas de geração automatizada de relatórios clínicos narrativos integrados a jogos sérios respiratórios;
- A tese de doutorado publicada pelo grupo (Dias, 2024) aponta a documentação clínica automatizada como uma das principais lacunas a serem endereçadas em trabalhos futuros.

---

### 1.3 Análise de Soluções Existentes (Benchmark)

Foram investigadas cinco soluções existentes que atendem, parcialmente, ao mesmo problema.

#### iHealth Explorer Tool

- **Link:** https://ihealthgroup.com
- **Público-alvo:** Clínicos e pacientes em geral.
- **Funcionalidades principais:** Visualização de dados de saúde, gráficos históricos de métricas como pressão arterial, frequência cardíaca e glicemia.
- **Limitações:** Não gera texto narrativo clínico; não integra com jogos sérios ou dados de reabilitação respiratória; não possui módulo de alertas configuráveis por paciente.

![Print do Sistema iHealth]

#### Apple ResearchKit — Asthma Health (Mount Sinai)

- **Link:** https://apple.com/researchkit
- **Público-alvo:** Pacientes adultos com asma.
- **Funcionalidades principais:** Monitoramento de sintomas, coleta de dados via app, identificação de gatilhos de exacerbação.
- **Limitações:** Sem geração de relatório clínico narrativo; sem suporte a jogos terapêuticos; dados inseridos manualmente pelo paciente.


![Print do Sistema](assets/ResearchKit1.jpg)

#### Breath Biofeedback Game — Bingham et al. (2010)

- **Link:** https://dl.acm.org/doi/10.1145/3706599.3720103?__cf_chl_tk=stH2Zw5WPh.UULR61oDF9.2uu0ni8M42TBqghke2cOQ-1775971020-1.0.1.1-xcd59Cd6AT38.Eb4dAnIAXWTgg0ou1MH6feEFrvkHFk
- **Público-alvo:** Crianças com Fibrose Cística.
- **Funcionalidades principais:** Biofeedback respiratório integrado a jogo; coleta de dados de sopro durante as sessões.
- **Limitações:** Sistema de pesquisa sem módulo de relatório para clínicos; dados coletados não são transformados em documentação clínica; sem histórico longitudinal por paciente.

![Print do Sistema](assets/BreathBiofeedbackGame.jpg)

#### MHealth CF Analytics — Vagg et al. (2018)

- **Link:** Literatura científica (IEEE CBMS 2018)
- **Público-alvo:** Adultos com Fibrose Cística e equipes clínicas.
- **Funcionalidades principais:** Analytics de dados de jogo sério respiratório, alertas automáticos por SMS para o paciente, ferramenta web para visualização pela equipe clínica.
- **Limitações:** Não gera narrativa clínica — apresenta apenas dados numéricos e gráficos; alertas são binários, sem texto interpretativo; sem exportação de relatório para o prontuário.

#### Nuance DAX

- **Link:** https://nuance.com
- **Público-alvo:** Médicos e equipes clínicas em geral.
- **Funcionalidades principais:** Transcrição automática de consultas, sumarização de notas clínicas via IA, integração com prontuários eletrônicos.
- **Limitações:** Não integra dados de jogos sérios ou sensores de reabilitação; custo elevado, inviável para projetos de pesquisa; focado em consultas presenciais, não em dados longitudinais de sessões domiciliares.

#### Comparação entre Soluções

| Solução               | Pontos Fortes                                      | Limitações                                              |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| iHealth Explorer      | Interface simples; histórico gráfico               | Sem narrativa clínica; sem integração com jogos sérios  |
| Apple ResearchKit     | Open source; coleta estruturada de sintomas        | Sem relatório narrativo; inserção manual pelo paciente  |
| Bingham et al.        | Integra sopro ao jogo; coleta dados respiratórios  | Sem módulo de relatório para clínicos                   |
| Vagg et al.           | Analytics de jogo + alertas; ferramenta web clínica| Sem narrativa; alertas binários; sem exportação PDF     |
| Nuance DAX            | Geração de texto clínico via IA de alta qualidade  | Sem integração com jogos sérios; custo inviável         |

#### Diferencial do Projeto

Nenhuma das soluções analisadas integra simultaneamente as três capacidades necessárias para o contexto do I Blue It:

1. **Processamento de logs de jogos sérios respiratórios** — extração e normalização das métricas geradas pelo jogo;
2. **Análise de padrões clínicos** — comparação longitudinal e detecção de deterioração ou melhora;
3. **Geração de relatório narrativo em linguagem natural via LLM** — texto clínico estruturado, em português, adequado para inclusão no prontuário.

Adicionalmente, a solução será **de código aberto**, adaptável por outros grupos de pesquisa que utilizem jogos sérios para reabilitação respiratória, e será desenvolvida com foco no fluxo de trabalho real das equipes clínicas parceiras.

---

### 1.4 Público-Alvo

O sistema será utilizado por **três perfis distintos** de usuários:

- **Fisioterapeuta / Equipe Multidisciplinar:** Profissional de saúde responsável pelo acompanhamento clínico dos pacientes em reabilitação respiratória. Realiza upload dos logs, consulta os relatórios gerados, acompanha a evolução histórica e configura critérios de alerta. É o usuário principal do sistema. Nível técnico: médio — familiaridade com computadores e sistemas web, sem conhecimento de programação ou análise de dados.

- **Técnico de Fisioterapia:** Aplica as sessões com o I Blue It e precisa consultar rapidamente o relatório mais recente e verificar se há alertas ativos antes de iniciar uma sessão. Nível técnico: básico — interface deve ser simples e direta.

- **Pesquisador:** Membro do grupo de pesquisa que acompanha múltiplos pacientes simultaneamente. Necessita de sínteses consolidadas dos dados para análise de eficácia do jogo e produção científica. Nível técnico: alto — confortável com dados estruturados e análises comparativas.

---

### 1.5 Objetivos do Projeto

#### Objetivo Geral

Desenvolver um sistema baseado em Inteligência Artificial que processe automaticamente os logs do exergame I Blue It e gere relatórios clínicos narrativos em linguagem natural, disponibilizados por meio de uma aplicação web para equipes de reabilitação respiratória — eliminando a dependência de interpretação manual dos dados e reduzindo o tempo de documentação clínica.

#### Objetivos Específicos

1. Implementar um pipeline de ingestão, extração e normalização de métricas clínicas a partir dos logs do I Blue It nos formatos JSON e CSV;
2. Desenvolver e iterar prompts de engenharia clínica para geração de texto narrativo via LLM, respeitando a terminologia da fisioterapia respiratória e as necessidades documentais identificadas com o parceiro;
3. Construir uma API de backend que orquestre o processamento dos logs, a chamada ao LLM e o armazenamento dos relatórios gerados;
4. Desenvolver uma interface web para visualização de relatórios por paciente, com histórico gráfico de métricas e sistema de alertas configuráveis por critério clínico;
5. Validar os relatórios gerados junto a pelo menos dois profissionais de saúde do grupo de pesquisa parceiro, por meio de protocolo estruturado de avaliação com escala Likert.

---

### 1.6 Métricas de Sucesso (KPIs)

O projeto será considerado bem-sucedido quando os seguintes critérios forem atendidos:

- **Tempo de geração:** Relatório gerado em até 30 segundos após o upload do log, do início ao fim do processamento pelo backend.
- **Qualidade narrativa:** Avaliação média ≥ 4,0 / 5,0 na escala Likert aplicada a fisioterapeutas avaliadores, considerando clareza, completude e aderência à terminologia clínica.
- **Cobertura de métricas:** 100% das métricas definidas no escopo extraídas corretamente dos logs em todos os formatos suportados.
- **Precisão de alertas:** Taxa de concordância ≥ 85% entre os alertas gerados automaticamente e a avaliação manual de um fisioterapeuta para os mesmos dados.
- **Adoção:** Pelo menos 2 profissionais de saúde do grupo parceiro utilizando o sistema ativamente nos primeiros 30 dias após a implantação do MVP.

---