const FeeMixer = artifacts.require('./FeeMixer.sol');
const MockFeeMixerV2 = artifacts.require('./MockFeeMixerV2.sol');
const OwnedUpgradeabilityProxy = artifacts.require('./OwnedUpgradeabilityProxy.sol');
const MockCoin = artifacts.require('./MockCoin.sol');

const { initHelperWeb3, assertRevert, ether } = require('./helpers');

const { web3 } = FeeMixer;

initHelperWeb3(web3);

contract('Proxy', accounts => {
  // Managers: alice, bob ,charlie, dan
  // Destinations: eve, frank, george, hannah
  const [coreTeam, alice, bob] = accounts;

  // alice is an owner of both the proxy and the mixer contract
  describe('Manager management', () => {
    it('keep data after upgrade', async function() {
      const mockCoin = await MockCoin.new({ from: coreTeam });

      const proxy = await OwnedUpgradeabilityProxy.new({ from: alice });
      let mixer = await FeeMixer.at(proxy.address);

      // Deploy V1
      const mixerV1 = await FeeMixer.new({ from: coreTeam });
      const txData1 = mixerV1.contract.methods.initialize(alice).encodeABI();
      await proxy.upgradeToAndCall(mixerV1.address, txData1, { from: alice });

      // Add some sources
      const calldata1 = mockCoin.contract.methods.transfer(alice, ether(20)).encodeABI();
      const calldata2 = mockCoin.contract.methods.transfer(bob, ether(20)).encodeABI();
      const calldata3 = mockCoin.contract.methods.transfer(alice, ether(30)).encodeABI();

      let res = await mixer.addSource(mockCoin.address, calldata1, { from: alice });
      const id1 = res.logs[0].args.id.toString(10);
      res = await mixer.addSource(mockCoin.address, calldata2, { from: alice });
      const id2 = res.logs[0].args.id.toString(10);
      res = await mixer.addSource(mockCoin.address, calldata3, { from: alice });
      const id3 = res.logs[0].args.id.toString(10);

      res = await mixer.getSources();
      assert.sameMembers(res, [id1, id2, id3]);

      // Upgrade to V2
      const mixerV2 = await MockFeeMixerV2.new({ from: coreTeam });
      mixer = await MockFeeMixerV2.at(proxy.address);
      const txData2 = mixerV2.contract.methods.v2setup().encodeABI();
      await proxy.upgradeToAndCall(mixerV2.address, txData2, { from: alice });
      await assertRevert(proxy.upgradeToAndCall(mixerV2.address, txData2, { from: alice }));

      // Assert the values haven't changed
      res = await mixer.getSources();
      assert.sameMembers(res, [id1, id2, id3]);

      // Assert a new methods available
      res = await mixer.getTheAnswer();
      assert.equal(res, 42);
    });
  });
});
