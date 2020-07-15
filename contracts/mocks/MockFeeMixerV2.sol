/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

pragma solidity ^0.5.13;

import "../FeeMixer.sol";


contract MockFeeMixerV2 is FeeMixer {
  uint256 theAnswer;
  bool v2setupDone;

  constructor() public {
    theAnswer = 15;
  }

  function v2setup() external {
    require(v2setupDone == false, "v2 setup is already done");
    theAnswer = 42;
    v2setupDone = true;
  }

  function getTheAnswer() external view returns (uint256) {
    return theAnswer;
  }
}
