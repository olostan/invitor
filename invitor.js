var openid = require('openid');
//var url = require('url');
//var querystring = require('querystring');
var express = require('express');

var mongodb = require('mongodb');
var mongoServer = new mongodb.Server("127.0.0.1", 27017, {});
var mongo = undefined;

var extensions = [new openid.UserInterface(), 
                  new openid.SimpleRegistration(
                      {
                        "nickname" : true, 
                        "email" : true, 
                        "fullname" : true,
                        "dob" : true, 
                        "gender" : true, 
                        "postcode" : true,
                        "country" : true, 
                        "language" : true, 
                        "timezone" : true
                      }),
                  new openid.AttributeExchange(
                      {
                        "http://axschema.org/contact/email": "required",
                        "http://axschema.org/namePerson/friendly": "required",
                        "http://axschema.org/namePerson": "required"
                      })];


var relyingParty = new openid.RelyingParty(
    'http://oni.dyndns.org:8081/verify', // Verification URL (yours)
    null, // Realm (optional, specifies realm for OpenID authentication)
    false, // Use stateless verification
    false, // Strict mode
    extensions); // List of extensions to enable and include

var app = express.createServer();
app.register(".html", require("jqtpl").express);
app.use(express.cookieParser());
app.use(express.session({ secret: "coni secret !22" }));
app.use(express.bodyParser());
app.use(express.errorHandler({dumpExceptions: true, showStack: true}));

app.get('/authenticate',function(req,res) {
  var identifier = "http://www.google.com/accounts/o8/id";
  // Resolve identifier, associate, and build authentication URL
  relyingParty.authenticate(identifier, false, function(error, authUrl)
  {
            if (error) { res.send('Authentication failed: ' + error,200); }
            else if (!authUrl)  { res.send('Authentication failed',200); }
            else { res.redirect(authUrl);  }
  });
});
app.get('/verify',function(req,res) {
            relyingParty.verifyAssertion(req, function(error, result)
            {
	      if(!error && result.authenticated) {
		req.session.email = result.email;
	      }
	      res.redirect('/');
            });
});

app.get("/",function(req,res) {
    if (!req.session.email) {
	res.render('auth.html');
    } else {
	var collection = new mongodb.Collection(mongo, 'users');
	collection.findOne({_id: req.session.email},function(err,user) {
	    if (!user) res.redirect('/change');
	    else {	    
		req.session.user = user;
		res.render("main.html", { user: user });
	    }
	});
    }
});
app.get('/style.css', express.static(__dirname+'/views/'));
app.get('/main.js', express.static(__dirname+'/views/'));
app.get('/change',function(req,res) {
    if (!req.session.email) res.redirect("/");
    else res.render('change.html');
});
app.post('/change',function(req,res) {
    if (!req.session.email) { res.redirect("/"); return }
    if (!req.body.usermode) { res.render("change.html"); return }
    var collection = new mongodb.Collection(mongo, 'users');
    collection.save(
	    {_id:req.session.email, mode: req.body.usermode, random: Math.random() },
	    {safe:true}, 
	    function(err,i) { res.redirect('/'); }
    );
});
app.get("/get/:email?", function(req,res) {
    var collection = new mongodb.Collection(mongo, 'users');
    if (req.params.email) {
	collection.update({_id:req.params.email},{$set: { mode: 'invited' }});
	var logs = new mongodb.Collection(mongo, 'logs');
	logs.insert({when: new Date(),who:req.session.email,what:"inv",whom: req.params.email});
    }
    var rand = Math.random();
    collection.findOne({ mode:'inviting', random: { $gte : rand }},function(err,user) {
	if (!user) {
	  collection.findOne({ mode:'inviting', random: { $lte : rand }},function(err,user) {
	    if (!user) res.send("{}");
	    else  res.send(user);
	  });
	} else res.send(user);
    });
});


new mongodb.Db('invitor', mongoServer, {}).open(function (error, client) {
  if (error) throw error;
  mongo = client;
  app.listen(8081);
});
