var REToken = artifacts.require("./REToken.sol");
var EscrowSmartContract = artifacts.require("./EscrowSmartContract.sol");

module.exports = function(deployer) {
  deployer.deploy(REToken, 3000)
  .then(function() {
    return deployer.deploy(EscrowSmartContract, REToken.address);
  });
};
