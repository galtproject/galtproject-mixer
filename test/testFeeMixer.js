const FeeMixer = artifacts.require('./FeeMixer.sol');
const MockCoin = artifacts.require('./MockCoin.sol');
const MockApplication = artifacts.require('./MockApplication.sol');
const MockApplicationNonPayable = artifacts.require('./MockApplicationNonPayable.sol');

const { ether, assertRevert, initHelperWeb3, assertEthBalanceChanged, assertGaltBalanceChanged } = require('./helpers');

const { web3 } = FeeMixer;

const { utf8ToHex, BN } = web3.utils;
const bytes32 = utf8ToHex;

initHelperWeb3(web3);

contract('FeeMixer', accounts => {
  // Managers: alice, bob ,charlie, dan
  // Destinations: eve, frank, george, hannah
  const [coreTeam, alice, bob, charlie, dan, eve, frank, george, hannah] = accounts;

  before(async function() {
    this.mixer = await FeeMixer.new({ from: coreTeam });
    this.mockCoin = await MockCoin.new({ from: coreTeam });
  });

  describe.skip('Manager management', () => {
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

      res = await this.mixer.addSource(this.mockCoin.address, calldata1, { from: coreTeam });
      const id1 = res.logs[0].args.id.toString(10);
      res = await this.mixer.addSource(this.mockCoin.address, calldata2, { from: coreTeam });
      const id2 = res.logs[0].args.id.toString(10);
      res = await this.mixer.addSource(this.mockCoin.address, calldata3, { from: coreTeam });
      const id3 = res.logs[0].args.id.toString(10);

      res = await this.mixer.getSources();
      assert.sameMembers(res, [id1, id2, id3]);
      res = await this.mixer.getSourcesByAddress(this.mockCoin.address);
      assert.sameMembers(res, [id1, id2, id3]);
      res = await this.mixer.getSourceCount();
      assert.equal(res, 3);
      res = await this.mixer.getSourcesByAddressCount(this.mockCoin.address);
      assert.equal(res, 3);

      res = await this.mixer.getSource(id1);
      assert.equal(res.active, true);
      assert.equal(res.addr, this.mockCoin.address);
      assert.equal(res.value, 0);
      assert.equal(res.data, calldata1);

      // same source
      await assertRevert(this.mixer.addSource(this.mockCoin.address, calldata1, { from: coreTeam }));
      // no permission
      await assertRevert(this.mixer.addSource(this.mockCoin.address, calldata4, { from: alice }));

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

  describe('Destination management', () => {
    it('allow the owner set destinations in a single action', async function() {
      let res = await this.mixer.getDestinations();
      assert.sameMembers(res.addresses, []);
      assert.sameMembers(res.shares, []);

      await this.mixer.setDestinations([eve, frank, george, hannah], [10, 40, 30, 20], { from: coreTeam });

      res = await this.mixer.getDestinations();
      assert.sameMembers(res.addresses, [eve, frank, george, hannah]);
      assert.sameMembers(res.shares.map(v => v.toNumber(10)), [10, 40, 30, 20]);

      await this.mixer.setDestinations([alice], [100], { from: coreTeam });

      res = await this.mixer.getDestinations();
      assert.sameMembers(res.addresses, [alice]);
      assert.sameMembers(res.shares.map(v => v.toNumber(10)), [100]);

      // no permission
      await assertRevert(this.mixer.setDestinations([bob], [100], { from: alice }));
    });
  });

  describe('Source fetching', () => {
    it('should allow a manager sending call to a source', async function() {
      assert.equal(await this.mockCoin.balanceOf(coreTeam), ether(10000));

      const mixer = await FeeMixer.new({ from: coreTeam });

      const mockApplication1 = await MockApplication.new(this.mockCoin.address, { from: coreTeam });
      const mockApplication2 = await MockApplicationNonPayable.new(this.mockCoin.address, { from: coreTeam });

      // transfer here some eths
      await web3.eth.sendTransaction({
        from: alice,
        to: mockApplication1.address,
        value: ether(500)
      });

      // transfer here some coins
      await this.mockCoin.transfer(mockApplication1.address, ether(1500), { from: coreTeam });
      await this.mockCoin.transfer(mockApplication2.address, ether(1500), { from: coreTeam });

      assert.equal(await web3.eth.getBalance(mockApplication1.address), ether(500));
      assert.equal(await web3.eth.getBalance(mockApplication2.address), ether(0));
      assert.equal(await this.mockCoin.balanceOf(mockApplication1.address), ether(1500));
      assert.equal(await this.mockCoin.balanceOf(mockApplication2.address), ether(1500));

      // mockApplication1
      const calldata1 = mockApplication1.contract.methods.claimProtocolEthFee().encodeABI();
      let res = await mixer.addSource(mockApplication1.address, calldata1, { from: coreTeam });
      const fetchEthSource1 = res.logs[0].args.id.toString(10);

      const calldata2 = mockApplication1.contract.methods.claimProtocolGaltFee(bytes32('Id')).encodeABI();
      res = await mixer.addSource(mockApplication1.address, calldata2, { from: coreTeam });
      const fetchGaltSource1 = res.logs[0].args.id.toString(10);

      // mockApplication2
      const calldata4 = mockApplication2.contract.methods.claimProtocolGaltFee(bytes32('Id')).encodeABI();
      res = await mixer.addSource(mockApplication2.address, calldata4, { from: coreTeam });
      const fetchGaltSource2 = res.logs[0].args.id.toString(10);

      // > (1) fetchEthSource1
      let mixerBalanceBefore = await web3.eth.getBalance(mixer.address);
      const mockApplication1EthBalanceBefore = await web3.eth.getBalance(mockApplication1.address);

      await mixer.callSource(fetchEthSource1, { from: alice });
      // 2nd event is pushed only in case of error
      assert.equal(res.logs.length, 1);

      let mixerBalanceAfter = await web3.eth.getBalance(mixer.address);
      const mockApplication1EthBalanceAfter = await web3.eth.getBalance(mockApplication1.address);

      assertEthBalanceChanged(mixerBalanceBefore, mixerBalanceAfter, ether(500));
      assertEthBalanceChanged(mockApplication1EthBalanceBefore, mockApplication1EthBalanceAfter, ether(-500));

      // Can be called multiple times
      await mixer.callSource(fetchEthSource1, { from: alice });

      // > (2) fetchGaltSource1
      mixerBalanceBefore = new BN(await this.mockCoin.balanceOf(mixer.address)).toString(10);
      const mockApplication1GaltBalanceBefore = new BN(
        await this.mockCoin.balanceOf(mockApplication1.address)
      ).toString(10);

      await mixer.callSource(fetchGaltSource1, { from: bob });
      // 2nd event is pushed only in case of error
      assert.equal(res.logs.length, 1);

      mixerBalanceAfter = new BN(await this.mockCoin.balanceOf(mixer.address)).toString(10);
      const mockApplication1GaltBalanceAfter = new BN(await this.mockCoin.balanceOf(mockApplication1.address)).toString(
        10
      );

      assertGaltBalanceChanged(mixerBalanceBefore, mixerBalanceAfter, ether(1500));
      assertGaltBalanceChanged(mockApplication1GaltBalanceBefore, mockApplication1GaltBalanceAfter, ether(-1500));

      // > (3) fetchGaltSource2
      mixerBalanceBefore = new BN(await this.mockCoin.balanceOf(mixer.address)).toString(10);
      const mockApplication2GaltBalanceBefore = new BN(
        await this.mockCoin.balanceOf(mockApplication2.address)
      ).toString(10);

      // Could be called any time
      await mixer.callSource(fetchGaltSource2, { from: bob });
      await mixer.callSource(fetchGaltSource2, { from: bob });
      await mixer.callSource(fetchGaltSource2, { from: bob });

      // 2nd event is pushed only in case of error
      assert.equal(res.logs.length, 1);

      mixerBalanceAfter = new BN(await this.mockCoin.balanceOf(mixer.address)).toString(10);
      const mockApplication2GaltBalanceAfter = new BN(await this.mockCoin.balanceOf(mockApplication2.address)).toString(
        10
      );

      assertGaltBalanceChanged(mixerBalanceBefore, mixerBalanceAfter, ether(1500));
      assertGaltBalanceChanged(mockApplication2GaltBalanceBefore, mockApplication2GaltBalanceAfter, ether(-1500));
    });
  });

  describe('Balance distribution', () => {
    it('should distribute provided amount of ETHs', async function() {
      const mixer = await FeeMixer.new({ from: coreTeam });

      await mixer.setDestinations([eve, frank, george, hannah], [10, 40, 35, 15], { from: coreTeam });

      await web3.eth.sendTransaction({
        from: alice,
        to: mixer.address,
        value: ether(777)
      });

      assert.equal(await web3.eth.getBalance(mixer.address), ether(777));

      const eveBalanceBefore = await web3.eth.getBalance(eve);
      const frankBalanceBefore = await web3.eth.getBalance(frank);
      const georgeBalanceBefore = await web3.eth.getBalance(george);
      const hannahBalanceBefore = await web3.eth.getBalance(hannah);

      await mixer.distributeEth(ether(222), { from: alice });

      const eveBalanceAfter = await web3.eth.getBalance(eve);
      const frankBalanceAfter = await web3.eth.getBalance(frank);
      const georgeBalanceAfter = await web3.eth.getBalance(george);
      const hannahBalanceAfter = await web3.eth.getBalance(hannah);

      // 222 ether * 10% = 22.2 ether
      assertEthBalanceChanged(eveBalanceBefore, eveBalanceAfter, ether(22.2));
      // 222 ether * 40% = 88.8 ether
      assertEthBalanceChanged(frankBalanceBefore, frankBalanceAfter, ether(88.8));
      // 222 ether * 35% = 77.7 ether
      assertEthBalanceChanged(georgeBalanceBefore, georgeBalanceAfter, ether(77.7));
      // 222 ether * 15% = 33.3 ether
      assertEthBalanceChanged(hannahBalanceBefore, hannahBalanceAfter, ether(33.3));

      assert.equal(await web3.eth.getBalance(mixer.address), ether(555));
    });

    it('should distribute provided amount of ERC20', async function() {
      const mixer = await FeeMixer.new({ from: coreTeam });

      await mixer.setDestinations([eve, frank, george, hannah], [10, 40, 37, 13], { from: coreTeam });

      await this.mockCoin.transfer(mixer.address, ether(179), { from: coreTeam });

      const eveBalanceBefore = new BN(await this.mockCoin.balanceOf(eve)).toString(10);
      const frankBalanceBefore = new BN(await this.mockCoin.balanceOf(frank)).toString(10);
      const georgeBalanceBefore = new BN(await this.mockCoin.balanceOf(george)).toString(10);
      const hannahBalanceBefore = new BN(await this.mockCoin.balanceOf(hannah)).toString(10);

      await mixer.distributeERC20(this.mockCoin.address, ether(179), { from: bob });

      const eveBalanceAfter = new BN(await this.mockCoin.balanceOf(eve)).toString(10);
      const frankBalanceAfter = new BN(await this.mockCoin.balanceOf(frank)).toString(10);
      const georgeBalanceAfter = new BN(await this.mockCoin.balanceOf(george)).toString(10);
      const hannahBalanceAfter = new BN(await this.mockCoin.balanceOf(hannah)).toString(10);

      // 179 ether * 10% = 17.9 ether
      assertGaltBalanceChanged(eveBalanceBefore, eveBalanceAfter, ether(17.9));
      // 179 ether * 40% = 71.6 ether
      assertGaltBalanceChanged(frankBalanceBefore, frankBalanceAfter, ether(71.6));
      // 179 ether * 37% = 66.23 ether
      assertGaltBalanceChanged(georgeBalanceBefore, georgeBalanceAfter, ether(66.23));
      // 179 ether * 13% = 23.27 ether
      assertGaltBalanceChanged(hannahBalanceBefore, hannahBalanceAfter, ether(23.27));

      assert.equal(await web3.eth.getBalance(mixer.address), ether(0));
    });
  });
});
