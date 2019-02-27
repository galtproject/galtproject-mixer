const FeeMixer = artifacts.require('./FeeMixer.sol');

const { ether, assertRevert, initHelperWeb3 } = require('./helpers');

const { web3 } = FeeMixer;

initHelperWeb3(web3);

contract('ExpelFundMemberProposal', accounts => {
  const [coreTeam, alice, bob, charlie, dan, eve, frank, minter, geoDateManagement, unauthorized] = accounts;

  before(async function() {
    this.mixer = await FeeMixer.new({ from: coreTeam });
  });

  describe('Manager management', () => {
    it('allow manager addition/removal for the owner', async function() {
      let res = await this.mixer.getManagers();
      assert.sameMembers(res, []);

      await this.mixer.addManager(alice, { from: coreTeam });
      await this.mixer.addManager(bob, { from: coreTeam });
      await this.mixer.addManager(charlie, { from: coreTeam });

      res = await this.mixer.getManagers();
      assert.sameMembers(res, [alice, bob, charlie]);

      await assertRevert(this.mixer.addManager(charlie, { from: alice }));

    });
  });
});
