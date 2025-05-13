// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract BlockFund {
    struct Campaign {
        bytes32 id;
        address payable owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        string[] documents;
        string[] videos;
        address[] donors;
        uint256[] donations;
        bool isVerified;
        bool isCompleted;
    }

    mapping(bytes32 => Campaign) public campaigns;
    bytes32[] public campaignIds;
    uint256 public numberOfCampaigns = 0;
    mapping(address => bool) public verifiedCreators;
    address public admin;

    event CampaignCreated(bytes32 indexed id, address indexed owner, string title, uint256 target, uint256 deadline);
    event DonationMade(bytes32 indexed campaignId, address indexed donor, uint256 amount);
    event CreatorVerified(address indexed creator);
    event CampaignVerified(bytes32 indexed campaignId);
    event CampaignCompleted(bytes32 indexed campaignId);

    constructor() {
        admin = msg.sender;
        verifiedCreators[admin] = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyVerifiedCreator() {
        require(verifiedCreators[msg.sender], "Only verified creators can perform this action");
        _;
    }

    function createCampaign(
        bytes32 _id,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image,
        string[] memory _documents,
        string[] memory _videos
    ) public onlyVerifiedCreator returns (bytes32) {
        require(campaigns[_id].owner == address(0), "Campaign ID already exists");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_target > 0, "Target amount must be greater than 0");

        Campaign storage campaign = campaigns[_id];

        campaign.id = _id;
        campaign.owner = payable(msg.sender);
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.amountCollected = 0;
        campaign.image = _image;
        campaign.documents = _documents;
        campaign.videos = _videos;
        campaign.isVerified = false;
        campaign.isCompleted = false;

        campaignIds.push(_id);
        numberOfCampaigns++;

        emit CampaignCreated(_id, msg.sender, _title, _target, _deadline);
        return _id;
    }

    function donateToCampaign(bytes32 _id) public payable {
        Campaign storage campaign = campaigns[_id];

        require(campaign.deadline > block.timestamp, "Campaign deadline has passed");
        require(!campaign.isCompleted, "Campaign is already completed");
        require(msg.value > 0, "Donation amount must be greater than 0");

        uint256 remainingAmount = campaign.target - campaign.amountCollected;
        require(msg.value <= remainingAmount, "Donation exceeds the remaining target amount");

        campaign.donors.push(msg.sender);
        campaign.donations.push(msg.value);
        
        // IMPORTANT: Update the amount collected BEFORE sending ETH to prevent reentrancy attacks
        campaign.amountCollected += msg.value;

        // Send ETH directly to the campaign owner
        (bool sent, ) = campaign.owner.call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        if (campaign.amountCollected >= campaign.target) {
            campaign.isCompleted = true;
            emit CampaignCompleted(_id);
        }

        emit DonationMade(_id, msg.sender, msg.value);
    }

    function getDonors(bytes32 _id) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donors, campaigns[_id].donations);
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignIds.length);
        for (uint i = 0; i < campaignIds.length; i++) {
            allCampaigns[i] = campaigns[campaignIds[i]];
        }
        return allCampaigns;
    }

    function verifyCreator(address _creator) public onlyAdmin {
        verifiedCreators[_creator] = true;
        emit CreatorVerified(_creator);
    }

    function verifyCampaign(bytes32 _id) public onlyAdmin {
        campaigns[_id].isVerified = true;
        emit CampaignVerified(_id);
    }

    function isVerifiedCreator(address _user) public view returns (bool) {
        return verifiedCreators[_user];
    }

    function markCampaignCompleted(bytes32 _id) public {
        Campaign storage campaign = campaigns[_id];
        require(
            block.timestamp > campaign.deadline || campaign.amountCollected >= campaign.target,
            "Campaign cannot be marked as completed yet"
        );
        campaign.isCompleted = true;
        emit CampaignCompleted(_id);
    }

    function getCampaignIds() public view returns (bytes32[] memory) {
        return campaignIds;
    }
}