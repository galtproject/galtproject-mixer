/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

pragma solidity ^0.5.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract MockApplication {
  IERC20 galtToken;

  constructor(IERC20 _galtToken) public {
    galtToken = _galtToken;
  }

  function claimProtocolEthFee() external {
    msg.sender.transfer(address(this).balance);
  }

  function claimProtocolGaltFee(bytes32 _applicationId) external {
    galtToken.transfer(msg.sender, galtToken.balanceOf(address(this)));
  }

  function () external payable {
  }
}
