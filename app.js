const express = require('express');

const app = express();
const port = 3000;

const path = require('path');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));
app.use(express.json());

app.set('view engine', 'ejs');

const session = require('express-session');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));


function isAuthorized(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).send('You must log in to access this feature');
    }
}

const url = 'mongodb://127.0.0.1:27017/details'; // Replace with your MongoDB connection URL
const secretKey = 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY5ODMyMzAwNCwiaWF0IjoxNjk4MzIzMDA0fQ.oliXDweuyqg8qCkhqq6PUJkFE5lUKovEGQM0m137jmU'; // Replace with your own secret key

mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;    

db.on('connected',()=>{
    console.log('Connected to MongoDB Successfully');
})



db.on('error',(err)=>{
    console.error('Error Connecting to MongoDB');
})

// Define a schema for inventory items
const inventoryItemSchema = new mongoose.Schema({
    sport_name: { type: String, required: true },
    item_name: { type: String, required: true },
    quantity: { type: Number, required: true }
});

// Define a model for inventory items
const InventoryItem = mongoose.model('inventory', inventoryItemSchema);

app.get('/inventory',isAuthorized, (req,res) => {
    res.sendFile(path.join(__dirname+'/public/inventory.html'));
})

app.get('/api/inventory', async (req, res) => {
    try {
        const results = await db.collection('inventory').find().sort({ sport_name: 1 }).toArray();
        res.json(results);
    } catch (err) {
        console.error('Error fetching sports:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/items', async (req, res) => {
    const { sportName, itemName, quantity } = req.body;

    if (!sportName || !itemName || !quantity) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    try {
        const result = await db.collection('inventory').insertOne({
            sport_name: sportName,
            item_name: itemName,
            quantity: quantity
        });

        res.json({ id: result.insertedId, sportName, itemName, quantity });
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/items/:itemName', async (req, res) => {
    const { itemName } = req.params;

    if (!itemName) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    try {
        const result = await InventoryItem.deleteOne({ item_name: itemName });

        if (result.deletedCount === 0) {
            res.status(404).json({ error: 'Item not found' });
            res.send("Deletion Unsuccessful");
        } else {
            res.send("Deletion Successful");
            res.status(204).send();
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/items/:itemName', async (req, res) => {
    const { itemName } = req.params;
    const { quantity } = req.body;

    if (!itemName || !quantity) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    try {
        const result = await InventoryItem.updateOne({ item_name: itemName }, { quantity });

        if (result.nModified === 0) {
            res.status(404).json({ error: 'Item not found' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        console.error('Error updating item quantity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname+'/public/homepage.html'));
})

app.post('/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
      const results = await InventoryItem.find({ sport_name: { $regex: searchTerm, $options: 'i' } });
      console.log(results); // Add this line to log the results
      res.render('results', { results });
    } catch (error) {
      console.error(error);
    }
  });
  
  

app.get('/new_user_register', (req,res)=>{
    res.sendFile(path.join(__dirname+'/public/new_user_registration.html'));
})

app.get('/searchpage', (req,res)=>{
    res.sendFile(path.join(__dirname+'/public/searchpage.html'));
})

app.get('/new_shop_register', (req,res)=>{
    res.sendFile(path.join(__dirname + '/public/new_shop_register.html'));
})

app.get('/pro', (req,res)=>{
    res.sendFile(path.join(__dirname+'/product.html'));
})

const ConsumerSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true }
});

// Define a model for inventory items
const Consumer = mongoose.model('consumer', ConsumerSchema);


// User Registration Route
app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;
  
    // Basic validation
    if (!username || !password || !email) {
      return res.status(400).send('All fields are required');
    }
  
    try {
      // Hash the user's password before storing it
      const saltRounds = 10; // You can adjust the number of salt rounds
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Create and save the consumer to the database with the hashed password
      const newConsumer = new Consumer({
        username,
        password: hashedPassword,
        email
      });
  
      await newConsumer.save();
  
      res.status(201).send('Consumer Registration Successful');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error while Registering');
    }
  });


// User Registration Route


        // User Login Route
        app.post('/login', (req, res) => {
            const username = req.body.username;
            const password = req.body.password;

            // Query the database to find the user
            db.collection('consumers').findOne({ username: username }, (err, user) => {
                if (err) {
                    res.status(500).send('Error during login.');
                } else if (!user) {
                    res.status(401).send('User not found.');
                } else if (!bcrypt.compareSync(password, user.password)) {
                    res.status(401).send('Incorrect password.');
                } else {
                    // Generate a JWT and send it as a response for user authentication
                    const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
                    req.session.isLoggedIn = true;
                    res.redirect('/');
                }
            });
        });


        const productSchema = new mongoose.Schema({
            productName: { type: String, required: true },
            quantity: { type: Number, required: true },
            productDescription: { type: String, required: true },
            price: { type: Number, required: true },
          });
        
        const Product = mongoose.model('Product_DB', productSchema);
        
        const ItemSchema = new mongoose.Schema({
            name: String
            // Add other fields as needed
          });
          
          const Item = mongoose.model('Item', ItemSchema);
          
          app.use(express.json());
          app.use(express.urlencoded({ extended: false }));
          app.use(express.static('public'));
          
          app.get('/api/items', async (req, res) => {
            try {
              const searchQuery = req.query.search;
              const items = await Item.find({
                $or: [
                  { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search
                  { description: { $regex: searchQuery, $options: 'i' } },
                ],
              }).exec();
              res.json(items);
            } catch (error) {
              console.error(error);
              res.status(500).send('Error fetching data');
            }
          });
        
            app.post('/addProduct', async (req, res) => {
                const { productName, quantity, productDescription, price } = req.body;
              
                // Basic validation
                if (!productName || !quantity || !productDescription || !price) {
                  return res.status(400).send('All fields are required');
                }
              
                try {
                  // Create and save the product to the database
                  const newProduct = new Product({
                    productName,
                    quantity,
                    productDescription,
                    price
                  });
              
                  await newProduct.save();
              
                  res.status(201).send('Product added successfully');
                } catch (error) {
                  console.error(error);
                  res.status(500).send('Error while adding the product');
                }
              });


            
const Shopkeeper = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    shop_name: { type: String, required: true },
    shop_address: { type: String, required: true }
});

// Define a model for inventory items
const Shop = mongoose.model('shop_register', Shopkeeper);


// User Registration Route
app.post('/shop_signup', async (req, res) => {
    const { username, password, shop_name, phone_number, shop_address } = req.body;
  
    // Basic validation
    if (!username || !password || !shop_name || !shop_address || !phone_number) {
      return res.status(400).send('All fields are required');
    }
  
    try {
      // Hash the user's password before storing it
      const saltRounds = 10; // You can adjust the number of salt rounds
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Create and save the consumer to the database with the hashed password
      const newConsumer = new Consumer({
        username,
        password: hashedPassword,
        shop_name,
        phone_number,
        shop_address
      });
  
      await newConsumer.save();
  
      res.status(201).send('Shopkeeper Registration Successful');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error while Registering');
    }
  });


// User Registration Route


        // User Login Route
        app.post('/shop_login', (req, res) => {
            const username = req.body.username;
            const password = req.body.password;

            // Query the database to find the user
            db.collection('shop_register').findOne({ username: username }, (err, user) => {
                if (err) {
                    res.status(500).send('Error during login.');
                } else if (!user) {
                    res.status(401).send('User not found.');
                } else if (!bcrypt.compareSync(password, user.password)) {
                    res.status(401).send('Incorrect password.');
                } else {
                    // Generate a JWT and send it as a response for user authentication
                    const token = jwt.sign({ username: user.username }, secretKey, { expiresIn: '1h' });
                    req.session.isLoggedIn = true;
                    res.redirect('/');
                }
            });
        });








        app.listen(port, () => {
            console.log(`Server is listening on port ${port}`);
        });
