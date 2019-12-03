/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

pragma solidity ^0.5.13;

import "@galtproject/libs/contracts/traits/OwnableAndInitializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@galtproject/libs/contracts/collections/ArraySet.sol";
import "./mocks/MockApplication.sol";


contract FeeMixer is OwnableAndInitializable {
  using ArraySet for ArraySet.AddressSet;
  using ArraySet for ArraySet.Bytes32Set;

  event AddSource(bytes32 id, address indexed addr);
  event RemoveSource(bytes32 id, address indexed addr);
  event SetDestinations(uint256 count);
  event CallSource(bytes32 indexed id, address indexed sender, bool ok);
  event CallSourceFailed(bytes32 indexed id, address indexed sender, address destination, bytes data);
  event DistributeEthBeneficiary(address beneficiary, uint256 amount);
  event DistributeEth(address sender, uint256 beneficiaries, uint256 passedInAmount, uint256 distributedAmount);
  event DistributeERC20Beneficiary(address beneficiary, uint256 amount);
  event DistributeERC20(address sender, uint256 beneficiaries, uint256 passedInAmount, uint256 distributedAmount);

  struct Source {
    address addr;
    bytes data;
  }

  address[] internal destinationAddresses;
  uint256[] internal destinationShares;

  mapping(bytes32 => Source) internal sourceDetails;
  mapping(address => ArraySet.Bytes32Set) internal sourcesByAddress;

  ArraySet.Bytes32Set internal sources;

  function removeSource(bytes32 _id) external onlyOwner {
    // keep sourceDetails
    sources.remove(_id);
    sourcesByAddress[sourceDetails[_id].addr].remove(_id);

    emit RemoveSource(_id, sourceDetails[_id].addr);
  }

  function initialize(address _newOwner) external isInitializer {
    _transferOwnership(_newOwner);
  }

  function addSource(address _addr, bytes calldata _data) external onlyOwner {
    bytes32 id = keccak256(abi.encode(_addr, _data));

    require(sources.has(id) == false, "Source already exists");

    Source storage s = sourceDetails[id];

    s.addr = _addr;
    s.data = _data;

    sources.add(id);
    sourcesByAddress[_addr].add(id);

    emit AddSource(id, _addr);
  }

  function setDestinations(address[] calldata _addresses, uint256[] calldata _shares) external onlyOwner {
    require(_addresses.length == _shares.length, "Address and share lengths should be equal");

    uint256 total = 0;
    uint256 len = _shares.length;

    for (uint256 i = 0; i < len; i++) {
      total += _shares[i];
    }

    require(total == 100, "Total shares should be equal 100%");

    destinationAddresses = _addresses;
    destinationShares = _shares;

    emit SetDestinations(len);
  }

  // Trigger contract  contract using `call()` to the source
  function callSource(bytes32 _sourceId) external returns (bool) {
    Source storage s = sourceDetails[_sourceId];

    require(sources.has(_sourceId) == true, "Invalid ID");

    address destination = s.addr;
    bytes memory data = s.data;
    uint256 dataLength = s.data.length;

    bool result;

    assembly {
        let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
        let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
        result := call(
            sub(gas, 34710),   // 34710 is the value that solidity is currently emitting
                               // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
                               // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
            destination,
            0,                 // Passing in value option doesn't supported
            d,
            dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
            x,
            0                  // Output is ignored, therefore the output size is zero
        )
    }

    emit CallSource(_sourceId, msg.sender, result);

    if (result == false) {
      emit CallSourceFailed(_sourceId, msg.sender, destination, data);
    }

    return result;
  }

  function distributeEth(uint256 _value) external {
    require(_value <= address(this).balance, "Not enough funds");

    uint256 total = 0;
    uint256 reward = 0;
    address payable beneficiary;

    for (uint256 i = 0; i < destinationShares.length; i++) {
      reward = _value * destinationShares[i] / 100;
      beneficiary = address(uint160(destinationAddresses[i]));
      beneficiary.transfer(reward);
      total += reward;

      emit DistributeEthBeneficiary(beneficiary, reward);
    }

    emit DistributeEth(msg.sender, destinationAddresses.length, _value, total);
  }

  function distributeERC20(address _erc20Contract, uint256 _value) external {
    IERC20 token = IERC20(_erc20Contract);

    require(_value <= token.balanceOf(address(this)), "Not enough funds");

    uint256 total = 0;
    uint256 reward = 0;
    address beneficiary;

    for (uint256 i = 0; i < destinationShares.length; i++) {
      reward = _value * destinationShares[i] / 100;
      beneficiary = destinationAddresses[i];
      token.transfer(beneficiary, reward);
      total += reward;

      emit DistributeERC20Beneficiary(beneficiary, reward);
    }

    emit DistributeERC20(msg.sender, destinationAddresses.length, _value, total);
  }

  // GETTERS

  function getSources() external view returns (bytes32[] memory) {
    return sources.elements();
  }

  function getSourceCount() external view returns (uint256) {
    return sources.size();
  }

  function getSourcesByAddress(address _destination) external view returns (bytes32[] memory) {
    return sourcesByAddress[_destination].elements();
  }

  function getSourcesByAddressCount(address _destination) external view returns (uint256) {
    return sourcesByAddress[_destination].size();
  }

  function getSource(
    bytes32 _id
  )
    external
    view
    returns (
      bool active,
      address addr,
      bytes memory data
    )
  {
    Source storage s = sourceDetails[_id];

    active = sources.has(_id);
    addr = s.addr;
    data = s.data;
  }

  function getDestinations() external view returns (address[] memory addresses, uint256[] memory shares) {
    return (destinationAddresses, destinationShares);
  }

  function getDestinationCount() external view returns (uint256) {
    return destinationAddresses.length;
  }

  function () external payable {
  }
}
