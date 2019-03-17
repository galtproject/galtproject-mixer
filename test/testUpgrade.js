const FeeMixer = artifacts.require('./FeeMixer.sol');
const MockFeeMixerV2 = artifacts.require('./MockFeeMixerV2.sol');
const OwnedUpgradeabilityProxy = artifacts.require('./OwnedUpgradeabilityProxy.sol');

const { initHelperWeb3, assertRevert } = require('./helpers');

const { web3 } = FeeMixer;

initHelperWeb3(web3);

contract('Proxy', accounts => {
  // Managers: alice, bob ,charlie, dan
  // Destinations: eve, frank, george, hannah
  const [coreTeam, alice, bob, charlie, dan] = accounts;

  // alice is an owner of both the proxy and the mixer contract
  describe('Manager management', () => {
    it('keep data after upgrade', async function() {
      const proxy = await OwnedUpgradeabilityProxy.new({ from: alice });
      let mixer = await FeeMixer.at(proxy.address);

      // Deploy V1
      const mixerV1 = await FeeMixer.new({ from: coreTeam });
      const txData1 = mixerV1.contract.methods.initialize(alice).encodeABI();
      await proxy.upgradeToAndCall(mixerV1.address, txData1, { from: alice });

      // Add some managers
      let res = await mixer.getManagers();
      assert.sameMembers(res, []);

      await mixer.addManager(bob, { from: alice });
      await mixer.addManager(charlie, { from: alice });
      await mixer.addManager(dan, { from: alice });

      res = await mixer.getManagers();
      assert.sameMembers(res, [bob, charlie, dan]);

      // Upgrade to V2
      const mixerV2 = await MockFeeMixerV2.new({ from: coreTeam });
      mixer = await MockFeeMixerV2.at(proxy.address);
      const txData2 = mixerV2.contract.methods.v2setup().encodeABI();
      await proxy.upgradeToAndCall(mixerV2.address, txData2, { from: alice });
      await assertRevert(proxy.upgradeToAndCall(mixerV2.address, txData2, { from: alice }));

      // Assert the values haven't changed
      res = await mixer.getManagers();
      assert.sameMembers(res, [bob, charlie, dan]);

      // Assert a new methods available
      res = await mixer.getTheAnswer();
      assert.equal(res, 42);
    });
  });
});
