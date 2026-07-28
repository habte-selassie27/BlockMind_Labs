// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlockMindAgentVault
 * @notice On-chain vault for AI agent transactions on GIWA testnet.
 *         Stores intent hashes, confirms execution, and logs agent activity.
 * @dev Deployed on GIWA Sepolia (Chain ID 91342)
 */
contract BlockMindAgentVault {

    // ── State ──────────────────────────────────────────────────

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

    // ── Events ─────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event IntentSubmitted(uint256 indexed intentId, bytes32 intentHash, address indexed agent, address indexed target, uint256 amount);
    event IntentExecuted(uint256 indexed intentId, bool success);
    event AgentRegistered(address indexed agent);
    event AgentRevoked(address indexed agent);

    // ── Modifiers ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegisteredAgent() {
        require(registeredAgents[msg.sender], "Not a registered agent");
        _;
    }

    // ── Constructor ────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ─────────────────────────────────────────

    /**
     * @notice Deposit GIWA tokens into the vault
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit > 0");
        agentBalances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Withdraw GIWA tokens from the vault
     */
    function withdraw(uint256 amount) external {
        require(agentBalances[msg.sender] >= amount, "Insufficient balance");
        agentBalances[msg.sender] -= amount;
        totalWithdrawals += amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Submit an AI agent intent for on-chain recording
     * @param intentHash Keccak256 hash of the intent description
     * @param target Target address for the action
     * @param amount Amount of GIWA involved
     */
    function submitIntent(
        bytes32 intentHash,
        address target,
        uint256 amount
    ) external onlyRegisteredAgent returns (uint256 intentId) {
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
        emit IntentSubmitted(intentId, intentHash, msg.sender, target, amount);
    }

    /**
     * @notice Mark an intent as executed (success or failure)
     */
    function executeIntent(uint256 intentId, bool success) external onlyRegisteredAgent {
        IntentRecord storage record = intents[intentId];
        require(record.agent == msg.sender, "Not your intent");
        require(!record.executed, "Already executed");
        record.executed = true;
        record.success = success;
        emit IntentExecuted(intentId, success);
    }

    // ── Admin Functions ────────────────────────────────────────

    function registerAgent(address agent) external onlyOwner {
        registeredAgents[agent] = true;
        emit AgentRegistered(agent);
    }

    function revokeAgent(address agent) external onlyOwner {
        registeredAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    // ── View Functions ─────────────────────────────────────────

    function getBalance(address user) external view returns (uint256) {
        return agentBalances[user];
    }

    function getIntentCount() external view returns (uint256) {
        return nonce;
    }
}
