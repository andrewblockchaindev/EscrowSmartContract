var REToken = artifacts.require("./REToken.sol");
var EscrowSmartContract = artifacts.require("./EscrowSmartContract.sol");

contract('EscrowSmartContract', function(accounts){
  var escrowSmartContractInstance;
  var reTokenInstance;
  var renter = accounts[2];
  var houseowner = accounts[4];
  var etherAmount = 5;                      //25 RETokens
  var renterBalanceBeforePutInPledge = 25;
  var pledgeRETokenAmount = 10;
  var pledgeId = 1;

  var sellerBalanceBeforeBuy, sellerBalanceAfterBuy;
  var buyerBalanceBeforeBuy, buyerBalanceAfterBuy;

  it("should put in pledge and then pick up pledge", function() {
    return REToken.deployed().then(function(instance) {
      reTokenInstance = instance;
      return reTokenInstance.buy({from: renter, value: web3.toWei(etherAmount, "ether")});
    }).then(function(receipt) {
      assert.equal(receipt.logs.length, 1, "one event should have been triggered");
      assert.equal(receipt.logs[0].event, "Transfer", "event should be Transfer");
      assert.equal(
        receipt.logs[0].args.value,
        renterBalanceBeforePutInPledge,
        "amount of RETokens must be " + renterBalanceBeforePutInPledge
      );
      return reTokenInstance.balanceOf(renter, {from: renter});
    }).then(function(data){
      assert.equal(
        data.toNumber(),
        renterBalanceBeforePutInPledge,
        "renter balance should have " + renterBalanceBeforePutInPledge + " RETokens"
      );

      return EscrowSmartContract.deployed();
    }).then(function(instance){
      escrowSmartContractInstance = instance;
      return reTokenInstance.approve(escrowSmartContractInstance.address, pledgeRETokenAmount, {from: renter});
    }).then(function(receipt){
      assert.equal(receipt.logs.length, 1, "one event should have been triggered");
      assert.equal(receipt.logs[0].event, "Approval", "event should be Approval");
      assert.equal(
        receipt.logs[0].args._value,
        pledgeRETokenAmount,
        "amount of RETokens must be " + pledgeRETokenAmount
      );

      return escrowSmartContractInstance.putInPledge(pledgeRETokenAmount, houseowner, {from: renter});
    }).then(function(receipt){
      assert.equal(receipt.logs.length, 1, "one event should have been triggered");
      assert.equal(receipt.logs[0].event, "LogPutInPledge", "event should be LogPutInPledge");
      assert.equal(
        receipt.logs[0].args._renter,
        renter,
        "renter of pledge must be " + renter
      );
      assert.equal(
        receipt.logs[0].args._houseowner,
        houseowner,
        "houseowner of pledge must be " + houseowner
      );
      assert.equal(
        receipt.logs[0].args._amount,
        pledgeRETokenAmount,
        "REToken amount of pledge must be " + pledgeRETokenAmount
      );
      assert.equal(
        receipt.logs[0].args._id,
        pledgeId,
        "id of pledge must be " + pledgeId
      );

      return escrowSmartContractInstance.pickUpPledge(pledgeId, {from: houseowner});
    }).then(function(receipt){
      assert.equal(receipt.logs.length, 1, "one event should have been triggered");
      assert.equal(receipt.logs[0].event, "LogPickUpPledge", "event should be LogPickUpPledge");
      assert.equal(
        receipt.logs[0].args._renter,
        renter,
        "renter of pledge must be " + renter
      );
      assert.equal(
        receipt.logs[0].args._houseowner,
        houseowner,
        "houseowner of pledge must be " + houseowner
      );
      assert.equal(
        receipt.logs[0].args._amount,
        pledgeRETokenAmount,
        "REToken amount of pledge must be " + pledgeRETokenAmount
      );
      assert.equal(
        receipt.logs[0].args._id,
        pledgeId,
        "id of pledge must be " + pledgeId
      );

      return reTokenInstance.balanceOf(houseowner, {from: houseowner});
    }).then(function(data){
      assert.equal(
        data.toNumber(),
        pledgeRETokenAmount,
        "houseowner balance should have " + pledgeRETokenAmount + " RETokens"
      );

      return reTokenInstance.sell(pledgeRETokenAmount, {from: houseowner});
    });
  });

});
