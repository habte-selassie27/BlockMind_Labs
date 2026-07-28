// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockMindAgentVault {

    // ── Constants ──────────────────────────────────────────────

    uint256 public constant MIN_STAKE = 1 ether;
    uint256 public constant STAKE_COOLDOWN = 7 days;
    uint256 public constant MAX_FEE_PERCENT = 500; // 5% (basis points)
    uint256 public constant VOTE_DURATION = 3 days;
    uint256 public constant EXECUTION_TIMELOCK = 2 days;
    uint256 public constant REPUTATION_DECAY = 1000; // 10.00 weight factor

    // ── Existing State ─────────────────────────────────────────

    address public owner;
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public nonce;

    struct IntentRecord {
        bytes32 intentHash;
        address agent;
        address target;
        uint256 amount;
        uint256 timestamp;
        bool executed;
        bool success;
    }

    mapping(uint256 => IntentRecord) public intents;
    mapping(address => bool) public registeredAgents;
    mapping(address => uint256) public agentBalances;

    // ── Staking State ──────────────────────────────────────────

    uint256 public minimumStake = MIN_STAKE;

    struct AgentStake {
        uint256 amount;
        uint256 lockedUntil;
        uint256 totalSlashed;
    }

    mapping(address => AgentStake) public agentStakes;
    address[] public stakedAgents;

    // ── Fee State ──────────────────────────────────────────────

    uint256 public feePercent = 100; // 1% default
    address public treasury;
    uint256 public accumulatedFees;

    mapping(address => uint256) public agentFeeClaims;

    // ── DID State ──────────────────────────────────────────────

    struct DIDDocument {
        address subject;
        bytes did;
        bytes metadata;
        uint256 registeredAt;
        bool revoked;
    }

    mapping(bytes32 => DIDDocument) public didRegistry; // keccak(did) => document
    mapping(address => bytes32) public addressToDID;

    // ── Reputation State ───────────────────────────────────────

    struct AgentReputation {
        uint256 totalIntents;
        uint256 successfulIntents;
        uint256 failedIntents;
        uint256 totalRatings;
        uint256 ratingSum; // sum of all 1-5 ratings
        uint256 lastActive;
    }

    mapping(address => AgentReputation) public reputation;
    mapping(address => mapping(address => uint8)) public userRatings; // user => agent => rating

    // ── Governance State ───────────────────────────────────────

    enum ProposalType { ChangeFee, ChangeMinStake, SlashAgent, WhitelistAgent, RemoveAgent, SetTreasury, UpgradeContract }
    enum ProposalStatus { Pending, Active, Passed, Executed, Rejected, Cancelled }

    struct Proposal {
        uint256 id;
        address proposer;
        ProposalType proposalType;
        string description;
        bytes data; // encoded call data
        uint256 createdAt;
        uint256 votingEnd;
        uint256 timelockEnd;
        ProposalStatus status;
        uint256 forVotes;
        uint256 againstVotes;
        mapping(address => bool) hasVoted;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    // ── Events ─────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event IntentSubmitted(uint256 indexed intentId, bytes32 intentHash, address indexed agent, address indexed target, uint256 amount);
    event IntentExecuted(uint256 indexed intentId, bool success);
    event AgentRegistered(address indexed agent, uint256 stakeAmount);
    event AgentRevoked(address indexed agent);
    event StakeLocked(address indexed agent, uint256 amount, uint256 lockedUntil);
    event StakeUnlocked(address indexed agent, uint256 amount);
    event StakeSlashed(address indexed agent, uint256 amount, string reason);
    event FeeCollected(address indexed agent, uint256 fee, uint256 timestamp);
    event FeeWithdrawn(address indexed agent, uint256 amount);
    event FeePercentChanged(uint256 oldFee, uint256 newFee);
    event TreasurySet(address indexed oldTreasury, address indexed newTreasury);
    event DIDRegistered(bytes32 indexed didHash, address indexed subject, bytes did);
    event DIDUpdated(bytes32 indexed didHash, bytes metadata);
    event DIDRevoked(bytes32 indexed didHash);
    event AgentRated(address indexed user, address indexed agent, uint8 rating);
    event ReputationUpdated(address indexed agent, uint256 totalIntents, uint256 successRate);
    event ProposalCreated(uint256 indexed proposalId, ProposalType proposalType, address indexed proposer);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event MinimumStakeChanged(uint256 oldMin, uint256 newMin);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegisteredAgent() {
        require(registeredAgents[msg.sender], "Not a registered agent");
        _;
    }

    modifier onlyActiveAgent() {
        require(registeredAgents[msg.sender], "Not a registered agent");
        require(agentStakes[msg.sender].lockedUntil > block.timestamp || agentStakes[msg.sender].amount >= minimumStake, "Stake too low");
        _;
    }

    // ── Constructor ────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        treasury = msg.sender;
    }

    // ── Existing Core Functions (Enhanced) ─────────────────────

    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        agentBalances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(uint256 amount) external {
        require(agentBalances[msg.sender] >= amount, "Insufficient balance");
        agentBalances[msg.sender] -= amount;
        totalWithdrawals += amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    function submitIntent(
        bytes32 intentHash,
        address target,
        uint256 amount
    ) external onlyActiveAgent returns (uint256 intentId) {
        intentId = nonce;
        intents[intentId] = IntentRecord({
            intentHash: intentHash,
            agent: msg.sender,
            target: target,
            amount: amount,
            timestamp: block.timestamp,
            executed: false,
            success: false
        });
        nonce++;
        reputation[msg.sender].totalIntents++;
        reputation[msg.sender].lastActive = block.timestamp;

        uint256 fee = (amount * feePercent) / 10000;
        if (fee > 0 && amount >= fee) {
            accumulatedFees += fee;
            agentFeeClaims[msg.sender] += fee;
            emit FeeCollected(msg.sender, fee, block.timestamp);
        }

        emit IntentSubmitted(intentId, intentHash, msg.sender, target, amount);
    }

    function executeIntent(uint256 intentId, bool success) external onlyRegisteredAgent {
        IntentRecord storage record = intents[intentId];
        require(record.agent == msg.sender, "Not your intent");
        require(!record.executed, "Already executed");
        record.executed = true;
        record.success = success;
        if (success) {
            reputation[msg.sender].successfulIntents++;
        } else {
            reputation[msg.sender].failedIntents++;
        }
        emit IntentExecuted(intentId, success);
        emit ReputationUpdated(msg.sender, reputation[msg.sender].totalIntents, getSuccessRate(msg.sender));
    }

    // ── Staking Functions ──────────────────────────────────────

    function registerAgent() external payable {
        require(!registeredAgents[msg.sender], "Already registered");
        require(msg.value >= minimumStake, "Stake too low");

        registeredAgents[msg.sender] = true;
        agentStakes[msg.sender] = AgentStake({
            amount: msg.value,
            lockedUntil: block.timestamp + STAKE_COOLDOWN,
            totalSlashed: 0
        });
        stakedAgents.push(msg.sender);
        emit AgentRegistered(msg.sender, msg.value);
        emit StakeLocked(msg.sender, msg.value, block.timestamp + STAKE_COOLDOWN);
    }

    function depositStake() external payable onlyRegisteredAgent {
        require(msg.value > 0, "Must deposit > 0");
        agentStakes[msg.sender].amount += msg.value;
        emit StakeLocked(msg.sender, msg.value, agentStakes[msg.sender].lockedUntil);
    }

    function requestUnstake() external onlyRegisteredAgent {
        AgentStake storage stake = agentStakes[msg.sender];
        require(stake.lockedUntil <= block.timestamp, "Still locked");
        stake.lockedUntil = block.timestamp + STAKE_COOLDOWN;
        emit StakeUnlocked(msg.sender, stake.amount);
    }

    function withdrawStake() external onlyRegisteredAgent {
        AgentStake storage stake = agentStakes[msg.sender];
        require(stake.lockedUntil <= block.timestamp, "Cooldown active");
        require(stake.lockedUntil > 0, "No unlock requested");

        uint256 amount = stake.amount;
        stake.amount = 0;
        registeredAgents[msg.sender] = false;
        payable(msg.sender).transfer(amount);
        emit AgentRevoked(msg.sender);
    }

    function slashStake(address agent, uint256 amount, string calldata reason) external {
        Proposal storage prop = proposals[proposalCount];
        require(prop.status == ProposalStatus.Executed, "Only approved proposals");
        require(prop.proposalType == ProposalType.SlashAgent, "Wrong proposal type");
        require(agentStakes[agent].amount >= amount, "Exceeds stake");

        agentStakes[agent].amount -= amount;
        agentStakes[agent].totalSlashed += amount;
        payable(treasury).transfer(amount);
        emit StakeSlashed(agent, amount, reason);
    }

    // ── Fee Functions ──────────────────────────────────────────

    function claimFees() external onlyRegisteredAgent {
        uint256 amount = agentFeeClaims[msg.sender];
        require(amount > 0, "No fees to claim");
        agentFeeClaims[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit FeeWithdrawn(msg.sender, amount);
    }

    function withdrawTreasuryFees() external {
        require(msg.sender == treasury, "Not treasury");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        payable(treasury).transfer(amount);
    }

    // ── DID Functions ──────────────────────────────────────────

    function registerDID(bytes calldata did, bytes calldata metadata) external {
        bytes32 didHash = keccak256(did);
        require(didRegistry[didHash].registeredAt == 0, "DID exists");
        require(addressToDID[msg.sender] == bytes32(0), "Already has DID");

        didRegistry[didHash] = DIDDocument({
            subject: msg.sender,
            did: did,
            metadata: metadata,
            registeredAt: block.timestamp,
            revoked: false
        });
        addressToDID[msg.sender] = didHash;
        emit DIDRegistered(didHash, msg.sender, did);
    }

    function updateDIDMetadata(bytes calldata metadata) external {
        bytes32 didHash = addressToDID[msg.sender];
        require(didHash != bytes32(0), "No DID");
        require(!didRegistry[didHash].revoked, "DID revoked");
        didRegistry[didHash].metadata = metadata;
        emit DIDUpdated(didHash, metadata);
    }

    function revokeDID() external {
        bytes32 didHash = addressToDID[msg.sender];
        require(didHash != bytes32(0), "No DID");
        didRegistry[didHash].revoked = true;
        addressToDID[msg.sender] = bytes32(0);
        emit DIDRevoked(didHash);
    }

    function resolveDID(bytes calldata did) external view returns (DIDDocument memory) {
        bytes32 didHash = keccak256(did);
        return didRegistry[didHash];
    }

    function getDIDByAddress(address subject) external view returns (DIDDocument memory) {
        bytes32 didHash = addressToDID[subject];
        require(didHash != bytes32(0), "No DID");
        return didRegistry[didHash];
    }

    // ── Reputation Functions ───────────────────────────────────

    function rateAgent(address agent, uint8 rating) external {
        require(rating >= 1 && rating <= 5, "Rating 1-5");
        require(registeredAgents[agent], "Not an agent");
        require(msg.sender != agent, "Cannot self-rate");
        require(userRatings[msg.sender][agent] == 0, "Already rated");

        userRatings[msg.sender][agent] = rating;
        reputation[agent].totalRatings++;
        reputation[agent].ratingSum += rating;
        emit AgentRated(msg.sender, agent, rating);
    }

    function getSuccessRate(address agent) public view returns (uint256) {
        AgentReputation memory rep = reputation[agent];
        if (rep.totalIntents == 0) return 0;
        return (rep.successfulIntents * 10000) / rep.totalIntents;
    }

    function getAverageRating(address agent) external view returns (uint256) {
        AgentReputation memory rep = reputation[agent];
        if (rep.totalRatings == 0) return 0;
        return (rep.ratingSum * 100) / rep.totalRatings; // scaled: 100-500
    }

    function getReputationScore(address agent) external view returns (uint256) {
        AgentReputation memory rep = reputation[agent];
        if (rep.totalIntents == 0) return 0;

        uint256 successRate = (rep.successfulIntents * 10000) / rep.totalIntents;
        uint256 avgRating = rep.totalRatings > 0 ? (rep.ratingSum * 100) / rep.totalRatings : 0;
        uint256 volumeScore = rep.totalIntents > 100 ? 100 : (rep.totalIntents * 100) / 100;

        return (successRate * 70 + avgRating * 20 + volumeScore * 10) / 100;
    }

    // ── Governance Functions ───────────────────────────────────

    function createProposal(ProposalType proposalType, string calldata description, bytes calldata data) external onlyRegisteredAgent {
        uint256 propId = proposalCount++;
        Proposal storage prop = proposals[propId];
        prop.id = propId;
        prop.proposer = msg.sender;
        prop.proposalType = proposalType;
        prop.description = description;
        prop.data = data;
        prop.createdAt = block.timestamp;
        prop.votingEnd = block.timestamp + VOTE_DURATION;
        prop.timelockEnd = block.timestamp + VOTE_DURATION + EXECUTION_TIMELOCK;
        prop.status = ProposalStatus.Active;
        prop.forVotes = 0;
        prop.againstVotes = 0;
        prop.executed = false;
        emit ProposalCreated(propId, proposalType, msg.sender);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage prop = proposals[proposalId];
        require(prop.status == ProposalStatus.Active, "Not active");
        require(block.timestamp < prop.votingEnd, "Voting ended");
        require(!prop.hasVoted[msg.sender], "Already voted");
        require(registeredAgents[msg.sender], "Not an agent");

        uint256 weight = agentStakes[msg.sender].amount;
        require(weight > 0, "No voting power");

        prop.hasVoted[msg.sender] = true;
        if (support) {
            prop.forVotes += weight;
        } else {
            prop.againstVotes += weight;
        }
        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(prop.status == ProposalStatus.Active, "Not active");
        require(block.timestamp >= prop.votingEnd, "Voting not ended");
        require(block.timestamp >= prop.timelockEnd, "Timelock active");
        require(!prop.executed, "Already executed");

        if (prop.forVotes <= prop.againstVotes) {
            prop.status = ProposalStatus.Rejected;
            return;
        }

        prop.status = ProposalStatus.Passed;
        prop.executed = true;

        if (prop.proposalType == ProposalType.ChangeFee) {
            uint256 newFee = abi.decode(prop.data, (uint256));
            require(newFee <= MAX_FEE_PERCENT, "Fee too high");
            uint256 oldFee = feePercent;
            feePercent = newFee;
            emit FeePercentChanged(oldFee, newFee);
        } else if (prop.proposalType == ProposalType.ChangeMinStake) {
            uint256 newMin = abi.decode(prop.data, (uint256));
            uint256 oldMin = minimumStake;
            minimumStake = newMin;
            emit MinimumStakeChanged(oldMin, newMin);
        } else if (prop.proposalType == ProposalType.SetTreasury) {
            (address newTreasury, address oldTreasury) = abi.decode(prop.data, (address, address));
            require(newTreasury != address(0), "Invalid treasury");
            treasury = newTreasury;
            emit TreasurySet(oldTreasury, newTreasury);
        } else if (prop.proposalType == ProposalType.WhitelistAgent) {
            address agent = abi.decode(prop.data, (address));
            if (!registeredAgents[agent]) {
                registeredAgents[agent] = true;
                emit AgentRegistered(agent, 0);
            }
        } else if (prop.proposalType == ProposalType.RemoveAgent) {
            address agent = abi.decode(prop.data, (address));
            if (registeredAgents[agent]) {
                registeredAgents[agent] = false;
                emit AgentRevoked(agent);
            }
        } else if (prop.proposalType == ProposalType.SlashAgent) {
            (address agent, uint256 amount, string memory reason) = abi.decode(prop.data, (address, uint256, string));
            if (agentStakes[agent].amount >= amount) {
                agentStakes[agent].amount -= amount;
                agentStakes[agent].totalSlashed += amount;
                payable(treasury).transfer(amount);
                emit StakeSlashed(agent, amount, reason);
            }
        } else if (prop.proposalType == ProposalType.UpgradeContract) {
            (address newImpl, bytes memory initData) = abi.decode(prop.data, (address, bytes));
            bytes memory upgradeData = abi.encodeWithSignature("upgradeTo(address)", newImpl);
            (bool success, ) = address(this).call(upgradeData);
            require(success, "Upgrade failed");
        }

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(msg.sender == prop.proposer || msg.sender == owner, "Not proposer or owner");
        require(prop.status == ProposalStatus.Active, "Not active");
        prop.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        ProposalType proposalType,
        string memory description,
        uint256 createdAt,
        uint256 votingEnd,
        uint256 timelockEnd,
        ProposalStatus status,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed
    ) {
        Proposal storage prop = proposals[proposalId];
        return (
            prop.id, prop.proposer, prop.proposalType, prop.description,
            prop.createdAt, prop.votingEnd, prop.timelockEnd, prop.status,
            prop.forVotes, prop.againstVotes, prop.executed
        );
    }

    // ── Admin Functions ────────────────────────────────────────

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ── View Functions ─────────────────────────────────────────

    function getBalance(address user) external view returns (uint256) {
        return agentBalances[user];
    }

    function getIntentCount() external view returns (uint256) {
        return nonce;
    }

    function getAgentInfo(address agent) external view returns (
        bool isRegistered,
        uint256 stake,
        uint256 lockedUntil,
        uint256 feeClaims,
        uint256 totalSlashed,
        bytes32 didHash
    ) {
        return (
            registeredAgents[agent],
            agentStakes[agent].amount,
            agentStakes[agent].lockedUntil,
            agentFeeClaims[agent],
            agentStakes[agent].totalSlashed,
            addressToDID[agent]
        );
    }

    function getStakedAgentsCount() external view returns (uint256) {
        return stakedAgents.length;
    }
}
