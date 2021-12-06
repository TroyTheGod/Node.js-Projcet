const assert = require('assert');
const qs = require ('querystring');
const MongoClient = require('mongodb').MongoClient;
const express = require('express'); 
const app = express();
var session = require('express-session');
app.set('view engine','ejs');
app.use(session({
    secret: 'nisdafbasijndfoajhe', 
    cookie: { maxAge: 6000 * 100000 },
    resave: false,
    saveUninitialized: true
  }));
const ObjectId = require('mongodb').ObjectId;
const mongourl = 'mongodb+srv://a:a@cluster0.wjrtv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const dbName = 'project';
const client = new MongoClient(mongourl);
const fs = require('fs');
const formidable = require('formidable');

// function handle_incoming_request(req,res) {
app.get('/login',(req, res) => {
    console.log("3");
    if(req.session.user){
        console.log("session.username = "+req.session.user);
        res.redirect('/home');
        console.log("session found,redirect to login");
    }else{
        res.set('Content-Type', 'text/html');
        res.status(200).render("login.ejs",{});
        return;
    }
            });
app.post('/login',(req, res) =>{
        
    console.log("4")
        let body = '';
        req.on('data', function(data) {
            body += data;
            });
        req.on('end',function(){
            let post = qs.parse(body);
            const uidpw = {"username":post.username};
            checkLogin(req,res,uidpw,post.password);
                    
                 })
});

app.get('/home',(req, res) =>{
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    databaseCon(res,(db)=>{
        db.collection("inventory").find({},{projection: {photo:0}}).toArray(function(err, result) {
        if (err) throw err;
        res.set('Content-Type', 'text/html');
        res.status(200).render("home.ejs",{
            numDocs:result.length,
            items:result,
            username:req.session.user
        });
        
        client.close();
        });
    });
});
app.get('/map',(req,res)=>{

    res.set('Content-Type', 'text/html');
    res.status(200).render("map.ejs",{
        lat:req.query.lat,
        lon:req.query.lon
    });
});
app.get('/item',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    console.log(req.query.id);
    databaseCon(res,(db)=>{
        db.collection("inventory").find({"_id":ObjectId(req.query.id)}).toArray(function(err, result) {
        if (err) throw err;
        res.set('Content-Type', 'text/html');
        console.log(result[0]);
        res.status(200).render("details.ejs",{
            item:result[0].name,
            image:result,
            result:result
        });
        client.close();
        });
    });
});
app.get('/create',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    res.set('Content-Type', 'text/html');
    res.status(200).render("create.ejs",{

    });
});
app.post('/create',(req,res)=>{
    const form = new formidable.IncomingForm();
            form.parse(req, (err, fields, files) => {
                console.log(files.photo.path);
                let query = {
                    "name": fields.name,
                    "type": fields.inv_type,
                    "quantity":fields.quantity,
                    // "photo": imgBase64,
                    // "photoMimetype": mimetype,
                    "inventory":{
                        "street": fields.street,
                        "building": fields.building,
                        "country": fields.country ,
                        "zipcode": fields.zipcode,
                        "lat":fields.latitude,
                        "lon":fields.longitude
                    },
                    "manager":  req.session.user
            }
                if (files.photo.size > 0) {
                    fs.readFile(files.photo.path, (err,data) => {
                        assert.equal(err,null);
                        let imgBase64 = new Buffer.from(data).toString('base64');
                        let mimetype = files.photo.type;
                        query.photo = imgBase64;
                        query.photoMimetype = mimetype;
                    })
                }    
                databaseCon(res,(db)=>{
                    db.collection("inventory").insertOne(query,(err,result) =>{
                        assert.equal(err,null);
                        console.log("insert was successful!");
                        console.log(JSON.stringify(result));
                        res.redirect("/home");
                    });
                })              
            })
                    

                    
});
app.get('/logout',(req,res)=>{
    req.session.destroy();
    res.redirect('/login');
});
app.get('/delete',(req,res)=>{
    console.log(req.session.user);
    console.log({"_id":ObjectId(req.query.id)});
    if(req.query.owner == req.session.user){
        databaseCon(res,(db)=>{
            db.collection("inventory").deleteOne({"_id":ObjectId(req.query._id)},(err,result) =>{
                assert.equal(err,null);
                console.log("deleteOne was successful!");
                console.log(JSON.stringify(result));
                res.redirect("/home");
            });
        })
    }else{
        res.set('Content-Type', 'text/html');
        res.status(200).end('you are not the owner of this item <button class="btn btn-primary" onclick="window.history.go(-1); return false;">Back</button>');
    }
});
app.get('/edit',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login');
        return;
    }
    if(req.query.owner != req.session.user){
        res.set('Content-Type', 'text/html');
        res.status(200).end('you are not the owner of this item <button class="btn btn-primary" onclick="window.history.go(-1); return false;">Back</button>');
    }else{
        console.log(req.query._id);
        databaseCon(res,(db)=>{
            db.collection("inventory").find({"_id":ObjectId(req.query._id)}).toArray(function(err, result) {
            if (err) throw err;
            res.set('Content-Type', 'text/html');
            console.log(result[0]);
            res.status(200).render("edit.ejs",{
                result:result
            });
            client.close();
            });
        });
    }
});
app.post('/edit',(req,res)=>{
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        console.log(files.photo.path);
        if (files.photo.size > 0) {
            fs.readFile(files.photo.path, (err,data) => {
                assert.equal(err,null);
                let imgBase64 = new Buffer.from(data).toString('base64');
                let mimetype = files.photo.type;
                let query = {
                    $set:{
                        "name": fields.name,
                        "type": fields.inv_type,
                        "quantity":fields.quantity,
                        "photo": imgBase64,
                        "photoMimetype": mimetype,
                        "inventory":{
                            "street": fields.street,
                            "building": fields.building,
                            "country": fields.country ,
                            "zipcode": fields.zipcode,
                            "lat":fields.latitude,
                            "lon":fields.longitude
                        }
                        }
                    }
                    console.log(fields);
                    databaseCon(res,(db)=>{
                        db.collection("inventory").updateOne({"_id":ObjectId(fields._id)},query,(err,result) =>{
                            assert.equal(err,null);
                            console.log("insert was successful!");
                            console.log(JSON.stringify(result));
                            res.redirect("/home");
                        });
                    })

                    })
}});
});
app.get('/api/inventory',(req,res)=>{
    let query =[];
    if(req.query.name != null){
        query.push({"name":req.query.name});
    }
    if(req.query.type != null){
        query.push({"type":req.query.type});
    }
    if(req.query.type == null && req.query.name == null){
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({}));
    }else{
        console.log(query);
        databaseCon(res,(db)=>{
            db.collection("inventory").find(query[0],query[1]).toArray(function(err, result) {
            if (err) throw err;
            res.set('Content-Type', 'application/json');
            console.log(result[0]);
            res.end(JSON.stringify(result));
            client.close();
            });
        });
    }
});
app.get('/',(req,res)=>{
    if(!req.session.user){
        res.redirect('/login');
        console.log("session not found,redirect to login");
        return;
    }else{
        res.redirect('/home');
    }
});
app.get('*',(req,res)=>{
    res.status(404).end("404 Not found");
});
    

const server = app.listen(process.env.PORT || 8099, () => {
  const port = server.address().port;
  console.log(`Server listening at port ${port}`);
});

const checkLogin = (req,res,criteria, password) => {
    let client = new MongoClient(mongourl);
	client.connect((err) => {
    assert.equal(null, err);
    console.log("checkLogin:Connected successfully to server");
    const db = client.db(dbName);
    let cursor = db.collection('user').find(criteria);
    //console.log("cursor = "+JSON.stringify(cursor));
    cursor.forEach((user) => {
        console.log("username= "+user.username);
        if(password == user.password){
                         //todo redirect
                         console.log(password +" == "+ user.password);
                         req.session.user = user.username;
                         console.log(req.session.user);
                         res.redirect('/home');
                     }else{
                        res.redirect('/login');
                        console.log("redirect to login");
                     }
    	});
	});
	client.close();
    console.log("Closed DB connection");
}
const databaseCon = (res,callback) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
    assert.equal(null, err);
    console.log("databaseCon:Connected successfully to server");
    const db = client.db(dbName);
        callback(db);
    });
    console.log("Closed DB connection");
}