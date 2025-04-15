
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BlockFund {
    // Struct to represent a campaign
    struct Campaign {
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
    }

    // Mapping from campaign ID to Campaign
    mapping(uint256 => Campaign) public campaigns;
    
    // Total number of campaigns
    uint256 public numberOfCampaigns = 0;
    
    // Mapping of verified campaign creators
    mapping(address => bool) public verifiedCreators;
    
    // Admin address
    address public admin;
    
    // Events
    event CampaignCreated(uint256 indexed id, address indexed owner, string title, uint256 target, uint256 deadline);
    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CreatorVerified(address indexed creator);
    event CampaignVerified(uint256 indexed campaignId);
    
    // Constructor
    constructor() {
        admin = msg.sender;
        verifiedCreators[admin] = true; // Admin is verified by default
    }
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedCreator() {
        require(verifiedCreators[msg.sender], "Only verified creators can perform this action");
        _;
    }

    // Function to create a campaign
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image,
        string[] memory _documents,
        string[] memory _videos
    ) public onlyVerifiedCreator returns (uint256) {
        Campaign storage campaign = campaigns[numberOfCampaigns];
        
        // Validation
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_target > 0, "Target amount must be greater than 0");
        
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
        
        numberOfCampaigns++;
        
        emit CampaignCreated(numberOfCampaigns - 1, msg.sender, _title, _target, _deadline);
        
        return numberOfCampaigns - 1;
    }
    
    // Function to donate to a campaign
    function donateToCampaign(uint256 _id) public payable {
        Campaign storage campaign = campaigns[_id];
        
        require(campaign.deadline > block.timestamp, "Campaign deadline has passed");
        require(msg.value > 0, "Donation amount must be greater than 0");
        
        campaign.donors.push(msg.sender);
        campaign.donations.push(msg.value);
        
        (bool sent,) = campaign.owner.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        
        campaign.amountCollected += msg.value;
        
        emit DonationMade(_id, msg.sender, msg.value);
    }
    
    // Function to get donors of a campaign
    function getDonors(uint256 _id) public view returns (address[] memory, uint256[] memory) {
        return (campaigns[_id].donors, campaigns[_id].donations);
    }
    
    // Function to get all campaigns
    function getCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);
        
        for(uint i = 0; i < numberOfCampaigns; i++) {
            allCampaigns[i] = campaigns[i];
        }
        
        return allCampaigns;
    }
    
    // Admin function to verify a creator
    function verifyCreator(address _creator) public onlyAdmin {
        verifiedCreators[_creator] = true;
        emit CreatorVerified(_creator);
    }
    
    // Admin function to verify a campaign
    function verifyCampaign(uint256 _id) public onlyAdmin {
        campaigns[_id].isVerified = true;
        emit CampaignVerified(_id);
    }
    
    // Function to check if a user is a verified creator
    function isVerifiedCreator(address _user) public view returns (bool) {
        return verifiedCreators[_user];
    }
}
