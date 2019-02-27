/*
 * Copyright ©️ 2018 Galt•Space Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka),
 * [Dima Starodubcev](https://github.com/xhipster),
 * [Valery Litvin](https://github.com/litvintech) by
 * [Basic Agreement](http://cyb.ai/QmSAWEG5u5aSsUyMNYuX2A2Eaz4kEuoYWUkVBRdmu9qmct:ipfs)).
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) and
 * Galt•Space Society Construction and Terraforming Company by
 * [Basic Agreement](http://cyb.ai/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS:ipfs)).
 */

pragma solidity 0.5.3;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "@galtproject/libs/contracts/collections/ArraySet.sol";

contract FeeMixer is Ownable {
  using ArraySet for ArraySet.AddressSet;

  struct Source {
    bool exists;
    address addr;
    uint256 value;
    bytes data;
  }

  mapping(bytes32 => Source) sources;

  ArraySet.AddressSet private managers;

  constructor() public {

  }

  modifier onlyManager() {
    require(managers.has(msg.sender), "Not a manager");

    _;
  }

  function addSource(address _addr, uint256 _value, bytes calldata _data) external onlyOwner {
    bytes32 id = keccak256(abi.encode(_addr, _value, _data));

    Source storage s = sources[id];
    require(s.exists == false, "Source already exists");

    s.exists = true;
    s.addr = _addr;
    s.value = _value;
    s.data = _data;
  }

  function addManager(address _manager) external onlyOwner {
    managers.add(_manager);
  }

  function removeManager(address _manager) external onlyOwner {
    managers.remove(_manager);
  }

  // GETTERS

  function getManagers() external view returns (address[] memory) {
     return managers.elements();
  }

  function getManagersCount() external view returns (uint256) {
    return managers.size();
  }
}