import { describe, it, expect, beforeEach } from 'vitest';

// Mock contract state
let proposals = new Map<number, any>();
let votes = new Map<string, boolean>();
let proposalCount = 0;

// Mock contract functions
const createProposal = (title: string, description: string, proposer: string, executionParams?: string) => {
  const proposalId = ++proposalCount;
  proposals.set(proposalId, {
    title,
    description,
    proposer,
    yesVotes: 0,
    noVotes: 0,
    status: 'active',
    executionParams: executionParams || null
  });
  return { type: 'ok', value: proposalId };
};

const getProposal = (proposalId: number) => {
  const proposal = proposals.get(proposalId);
  return proposal ? { type: 'ok', value: proposal } : { type: 'err', value: 404 };
};

const vote = (proposalId: number, voter: string, voteFor: boolean) => {
  const proposal = proposals.get(proposalId);
  if (!proposal) return { type: 'err', value: 404 };
  
  const voteKey = `${proposalId}-${voter}`;
  if (votes.has(voteKey)) return { type: 'err', value: 401 };
  
  votes.set(voteKey, voteFor);
  if (voteFor) {
    proposal.yesVotes++;
  } else {
    proposal.noVotes++;
  }
  return { type: 'ok', value: true };
};

const finalizeProposal = (proposalId: number) => {
  const proposal = proposals.get(proposalId);
  if (!proposal) return { type: 'err', value: 404 };
  if (proposal.status !== 'active') return { type: 'err', value: 403 };
  
  proposal.status = proposal.yesVotes > proposal.noVotes ? 'passed' : 'rejected';
  return { type: 'ok', value: true };
};

describe('Governance Contract', () => {
  beforeEach(() => {
    proposals.clear();
    votes.clear();
    proposalCount = 0;
  });
  
  it('allows creating a proposal', () => {
    const result = createProposal('Test Proposal', 'This is a test proposal', 'user1');
    expect(result.type).toBe('ok');
    expect(result.value).toBe(1);
    
    const proposalResult = getProposal(1);
    expect(proposalResult.type).toBe('ok');
    expect(proposalResult.value.title).toBe('Test Proposal');
    expect(proposalResult.value.proposer).toBe('user1');
    expect(proposalResult.value.status).toBe('active');
  });
  
  it('allows voting on a proposal', () => {
    createProposal('Voting Proposal', 'A proposal to test voting', 'user1');
    
    const voteResult1 = vote(1, 'user2', true);
    expect(voteResult1.type).toBe('ok');
    
    const voteResult2 = vote(1, 'user3', false);
    expect(voteResult2.type).toBe('ok');
    
    const proposalResult = getProposal(1);
    expect(proposalResult.type).toBe('ok');
    expect(proposalResult.value.yesVotes).toBe(1);
    expect(proposalResult.value.noVotes).toBe(1);
  });
  
  it('prevents double voting', () => {
    createProposal('Double Vote Test', 'Testing prevention of double voting', 'user1');
    
    const voteResult1 = vote(1, 'user2', true);
    expect(voteResult1.type).toBe('ok');
    
    const voteResult2 = vote(1, 'user2', false);
    expect(voteResult2.type).toBe('err');
    expect(voteResult2.value).toBe(401);
  });
  
  it('allows finalizing a proposal', () => {
    createProposal('Finalize Test', 'Testing proposal finalization', 'user1');
    
    vote(1, 'user2', true);
    vote(1, 'user3', true);
    vote(1, 'user4', false);
    
    const finalizeResult = finalizeProposal(1);
    expect(finalizeResult.type).toBe('ok');
    
    const proposalResult = getProposal(1);
    expect(proposalResult.type).toBe('ok');
    expect(proposalResult.value.status).toBe('passed');
  });
  
  it('prevents finalizing a non-existent proposal', () => {
    const finalizeResult = finalizeProposal(999);
    expect(finalizeResult.type).toBe('err');
    expect(finalizeResult.value).toBe(404);
  });
  
  it('prevents finalizing an already finalized proposal', () => {
    createProposal('Already Finalized', 'Testing finalization of an already finalized proposal', 'user1');
    vote(1, 'user2', true);
    finalizeProposal(1);
    
    const secondFinalizeResult = finalizeProposal(1);
    expect(secondFinalizeResult.type).toBe('err');
    expect(secondFinalizeResult.value).toBe(403);
  });
  
  it('correctly determines the outcome of a tied vote', () => {
    createProposal('Tie Breaker', 'Testing the outcome of a tied vote', 'user1');
    vote(1, 'user2', true);
    vote(1, 'user3', false);
    
    finalizeProposal(1);
    
    const proposalResult = getProposal(1);
    expect(proposalResult.type).toBe('ok');
    expect(proposalResult.value.status).toBe('rejected');
  });
  
  it('allows creating a proposal with execution parameters', () => {
    const executionParams = JSON.stringify({ action: 'update_world_parameters', params: { gravity: 9.8 } });
    const result = createProposal('Update Physics', 'Proposal to update world physics', 'user1', executionParams);
    expect(result.type).toBe('ok');
    
    const proposalResult = getProposal(result.value);
    expect(proposalResult.type).toBe('ok');
    expect(proposalResult.value.executionParams).toBe(executionParams);
  });
});

