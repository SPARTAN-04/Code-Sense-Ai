import { END, START, StateGraph } from '@langchain/langgraph';
import { architectureAgent } from '../agents/architecture.agent.js';
import { contextAgent } from '../agents/context.agent.js';
import { dependencyAgent } from '../agents/dependency.agent.js';
import { orchestratorAgent } from '../agents/orchestrator.agent.js';
import { plannerAgent } from '../agents/planner.agent.js';
import { reviewAgent } from '../agents/review.agent.js';
import { riskSummaryAgent } from '../agents/risk-summary.agent.js';
import { ruleEngineAgent } from '../agents/rule-engine.agent.js';
import { routingEngine } from '../routing/routing-engine.js';
import { PRReviewGraphState } from './pr-review.state.js';

export const PR_REVIEW_NODES = {
  orchestrator: 'orchestrator_agent',
  planner: 'planner_agent',
  dependency: 'dependency_agent',
  context: 'context_agent',
  ruleEngine: 'rule_engine_agent',
  review: 'review_agent',
  architecture: 'architecture_agent',
  riskSummary: 'risk_summary_agent',
};

export function buildPRReviewWorkflow() {
  return new StateGraph(PRReviewGraphState)
    .addNode(PR_REVIEW_NODES.orchestrator, orchestratorAgent)
    .addNode(PR_REVIEW_NODES.planner, plannerAgent)
    .addNode(PR_REVIEW_NODES.dependency, dependencyAgent)
    .addNode(PR_REVIEW_NODES.context, contextAgent)
    .addNode(PR_REVIEW_NODES.ruleEngine, ruleEngineAgent)
    .addNode(PR_REVIEW_NODES.review, reviewAgent)
    .addNode(PR_REVIEW_NODES.architecture, architectureAgent)
    .addNode(PR_REVIEW_NODES.riskSummary, riskSummaryAgent)
    .addEdge(START, PR_REVIEW_NODES.orchestrator)
    .addEdge(PR_REVIEW_NODES.orchestrator, PR_REVIEW_NODES.planner)
    .addEdge(PR_REVIEW_NODES.planner, PR_REVIEW_NODES.dependency)
    .addConditionalEdges(PR_REVIEW_NODES.dependency, routeAfterDependency)
    .addEdge(PR_REVIEW_NODES.context, PR_REVIEW_NODES.review)
    .addEdge(PR_REVIEW_NODES.ruleEngine, PR_REVIEW_NODES.review)
    .addConditionalEdges(PR_REVIEW_NODES.review, routeAfterReview)
    .addEdge(PR_REVIEW_NODES.architecture, PR_REVIEW_NODES.riskSummary)
    .addEdge(PR_REVIEW_NODES.riskSummary, END)
    .compile();
}

function routeAfterDependency(state) {
  const decision = routingEngine.decide(state, {
    stage: 'afterDependency',
  });

  return decision.nextAgents || decision.nextAgent;
}

function routeAfterReview(state) {
  const decision = routingEngine.decide(state, {
    stage: 'afterReview',
  });

  return decision.nextAgent;
}
