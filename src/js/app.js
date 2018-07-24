App = {
     web3Provider: null,
     contracts: {},
     account: 0x0,
     loading: false,
     retokenSymbol: "RET",

     init: function() {
          return App.initWeb3();
     },

     initWeb3: function() {
      // initialize web3
      if(typeof web3 !== 'undefined') {
        //reuse the provider of the Web3 object injected by Metamask
        App.web3Provider = web3.currentProvider;
      } else {
        //create a new provider and plug it directly into our local node
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      }
      web3 = new Web3(App.web3Provider);

      App.displayAccountInfo();

      return App.initContracts();
     },

    displayAccountInfo: function() {
      web3.eth.getCoinbase(function(err, account) {
        if(err === null) {
          App.account = account;

          $('#account').text(account);
          web3.eth.getBalance(account, function(err, balance) {
            if(err === null) {
              $('#accountBalance').text(web3.fromWei(balance, "ether") + " ETH");
            }
          })
        }
      });
    },

     initContracts: function() {
      $.getJSON('REToken.json', function(retokenArtifact) {
        // get the contract artifact file and use it to instantiate a truffle contract abstraction
        App.contracts.REToken = TruffleContract(retokenArtifact);
        // set the provider for our contracts
        App.contracts.REToken.setProvider(App.web3Provider);
        // retrieve the article from the contract
        return App.showRETokenInfo();
      });
       $.getJSON('EscrowSmartContract.json', function(escrowSmartContractArtifact) {
         // get the contract artifact file and use it to instantiate a truffle contract abstraction
         App.contracts.EscrowSmartContract = TruffleContract(escrowSmartContractArtifact);
         // set the provider for our contracts
         App.contracts.EscrowSmartContract.setProvider(App.web3Provider);
         // retrieve the article from the contract
         App.reloadPledges();
         // listen to events
         return App.listenToEvents();
       });
     },

    showRETokenInfo: function() {
      var retokenInstance;
      App.contracts.REToken.deployed().then(function(instance){
        retokenInstance = instance;
        return retokenInstance.symbol();
      }).then(function(symbol){
        App.retokenSymbol = symbol;
        return retokenInstance.balanceOf(App.account);
      }).then(function(retokenBalance){
        $('#retokenBalance').text(retokenBalance + ' ' + App.retokenSymbol);
        return retokenInstance.retokenPrice();
      }).then(function(priceInWei){
        $('#retokenPrice').text('1 RET = ' + web3.fromWei(priceInWei, "ether") + ' ETH');
      });
    },

    reloadPledges: function() {
      // avoid reentry
      if(App.loading) {
        return;
      }
      App.loading = true;

      // refresh account information because the balance might have changed
      App.displayAccountInfo();
      // refresh RET information because the balance might have changed
      App.showRETokenInfo();

      var escrowSmartContractInstance;

      App.contracts.EscrowSmartContract.deployed().then(function(instance) {
        escrowSmartContractInstance = instance;
        return escrowSmartContractInstance.getAvailablePledges();
      }).then(function(pledgeIds) {
        // retrieve the article placeholder and clear it
        $('#pledgesRow').empty();

        for(var i = 0; i < pledgeIds.length; i++) {
          var pledgeId = pledgeIds[i];
          escrowSmartContractInstance.pledges(pledgeId.toNumber()).then(function(pledge){
            App.displayPledge(pledge[0], pledge[1], pledge[2], pledge[3]);
            console.log("display lpedge");
          });
        }
        App.loading = false;
      }).catch(function(err) {
        console.error(err.message);
        App.loading = false;
      });
    },

    displayPledge: function(id, renter, houseowner, amount) {
      var pledgesRow = $('#pledgesRow');

      var pledgeTemplate = $("#pledgeTemplate");
      pledgeTemplate.find('.panel-title').text("Залог" + id);
      pledgeTemplate.find('.pledge-amount').text(amount + " " + App.retokenSymbol);
      pledgeTemplate.find('.btn-pick_up').attr('data-id', id);

      // renter
      if (renter == App.account) {
        pledgeTemplate.find('.pledge-renter').text("You");
      } else {
        pledgeTemplate.find('.pledge-renter').text(renter);
      }

      //houseowner
      if (houseowner == App.account) {
        pledgeTemplate.find('.pledge-houseowner').text('You');
        pledgeTemplate.find('.btn-pick_up').show();
      } else {
        pledgeTemplate.find('.pledge-houseowner').text(houseowner);
        pledgeTemplate.find('.btn-pick_up').hide();
      }

      // add this new article
      pledgesRow.append(pledgeTemplate.html());
    },

    buyRETokens: function() {
      var _retokenAmount = $('#retoken_amount').val();

      var retokenInstance;
      App.contracts.REToken.deployed().then(function(instance){
        retokenInstance = instance;

        return retokenInstance.retokenPrice();
      }).then(function(priceInWei){
        valueWei = _retokenAmount * priceInWei;

        return retokenInstance.buy({
          from: App.account,
          value: valueWei,
          gas: 500000
        });
      }).then(function(result) {
          App.showRETokenInfo();
          App.displayAccountInfo();
      }).catch(function(err) {
        console.error(err);
      });
    },

    sellRETokens: function() {
      var _retokenAmount = $('#sell_retoken_amount').val();

      App.contracts.REToken.deployed().then(function(instance){
        return instance.sell(_retokenAmount, {from: App.account});
      }).then(function(result) {
          App.showRETokenInfo();
          App.displayAccountInfo();
      }).catch(function(err) {
        console.error(err);
      });
    },

    putInPledge: function() {
      var _retokenAmount = $('#put_retoken_amount').val();
      var _houseowner = $('#houseowner').val();

      var retokenInstance;
      var escrowSmartContractInstance;
      App.contracts.EscrowSmartContract.deployed().then(function(instance){
        escrowSmartContractInstance = instance;
        return App.contracts.REToken.deployed();
      }).then(function(instance){
        retokenInstance = instance;
        return retokenInstance.approve(escrowSmartContractInstance.address, _retokenAmount, {from: App.account});
      }).then(function(result){
        var renter = App.account;
        return escrowSmartContractInstance.putInPledge(_retokenAmount, _houseowner, {from: renter, gas: 500000});
      }).then(function(receipt) {
        App.reloadPledges();
      }).catch(function(err) {
        console.error(err);
      });
    },

    pickUpPledge: function(event) {
      event.preventDefault();

      // retrieve the article
      var _pledgeId = $(event.target).data('id');

      App.contracts.EscrowSmartContract.deployed().then(function(instance){
        return instance.pickUpPledge(_pledgeId, {
          from: App.account,
          gas: 500000
        });
      }).then(function(result){
        App.reloadPledges();
      }).catch(function(error) {
        console.error(error);
      });
    },

    // listen to events triggered by the contract
    listenToEvents: function() {
      App.contracts.REToken.deployed().then(function(instance) {
        instance.Transfer({}, {}).watch(function(error, event) {
          if (!error) {
            $("#events").append('<li class="list-group-item"> Transfer ' + event.args.value + ' ' + App.retokenSymbol + ' from ' + event.args.from + ' to ' + event.args.to + ' </li>');
          } else {
            console.error(error);
          }
          App.showRETokenInfo();
        });


      });
    },
};

$(function() {
     $(window).load(function() {
          App.init();
     });
});
