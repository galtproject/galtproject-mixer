const FeeMixer = artifacts.require('./FeeMixer.sol');
const MockCoin = artifacts.require('./MockCoin.sol');

const { ether, assertRevert, initHelperWeb3 } = require('./helpers');

const { web3 } = FeeMixer;

initHelperWeb3(web3);

contract('ExpelFundMemberProposal', accounts => {
  const [coreTeam, alice, bob, charlie, dan, eve, frank, minter, unauthorized] = accounts;

  before(async function() {
    this.mixer = await FeeMixer.new({ from: coreTeam });
    this.mockCoin = await MockCoin.new({ from: coreTeam });
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
      res = await this.mixer.getManagerCount();
      assert.equal(res, 3);

      // same member
      await assertRevert(this.mixer.addManager(charlie, { from: coreTeam }));
      // no permission
      await assertRevert(this.mixer.addManager(dan, { from: alice }));

      await this.mixer.removeManager(bob, { from: coreTeam });

      res = await this.mixer.getManagers();
      assert.sameMembers(res, [alice, charlie]);
      res = await this.mixer.getManagerCount();
      assert.equal(res, 2);

      // not exists
      await assertRevert(this.mixer.removeManager(bob, { from: coreTeam }));
      // no permission
      await assertRevert(this.mixer.removeManager(charlie, { from: alice }));
    });
  });

  describe('Sources management', () => {
    it('allow add/remove operations for the owner', async function() {
      let res = await this.mixer.getSources();
      assert.sameMembers(res, []);

      const calldata1 = this.mockCoin.contract.methods.transfer(alice, ether(20)).encodeABI();
      const calldata2 = this.mockCoin.contract.methods.transfer(bob, ether(20)).encodeABI();
      const calldata3 = this.mockCoin.contract.methods.transfer(alice, ether(30)).encodeABI();
      const calldata4 = this.mockCoin.contract.methods.transfer(alice, ether(40)).encodeABI();

      res = await this.mixer.addSource(this.mockCoin.address, 0, calldata1, { from: coreTeam });
      const id1 = res.logs[0].args.id.toString(10);
      res = await this.mixer.addSource(this.mockCoin.address, 0, calldata2, { from: coreTeam });
      const id2 = res.logs[0].args.id.toString(10);
      res = await this.mixer.addSource(this.mockCoin.address, 0, calldata3, { from: coreTeam });
      const id3 = res.logs[0].args.id.toString(10);

      res = await this.mixer.getSources();
      assert.sameMembers(res, [id1, id2, id3]);
      res = await this.mixer.getSourceCount();
      assert.equal(res, 3);

      res = await this.mixer.getSource(id1);
      assert.equal(res.active, true);
      assert.equal(res.addr, this.mockCoin.address);
      assert.equal(res.value, 0);
      assert.equal(res.data, calldata1);

      // same source
      await assertRevert(this.mixer.addSource(this.mockCoin.address, 0, calldata1, { from: coreTeam }));
      // no permission
      await assertRevert(this.mixer.addSource(this.mockCoin.address, 0, calldata4, { from: alice }));

      await this.mixer.removeSource(id2, { from: coreTeam });

      res = await this.mixer.getSource(id2);
      assert.equal(res.active, false);
      assert.equal(res.addr, this.mockCoin.address);
      assert.equal(res.value, 0);
      assert.equal(res.data, calldata2);

      res = await this.mixer.getSources();
      assert.sameMembers(res, [id1, id3]);
      res = await this.mixer.getSourceCount();
      assert.equal(res, 2);

      // not exists
      await assertRevert(this.mixer.removeSource(id2, { from: coreTeam }));
      // no permission
      await assertRevert(this.mixer.removeSource(id1, { from: alice }));
    });
  });
});
