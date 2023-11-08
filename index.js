const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

//middleware


app.use(express.json());
app.use(cookieParser());

const corsOptions = {
    origin: 'https://blognestweb.netlify.app',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;


    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log("error token")
            return res.status(401).send({ message: 'Unauthorized Access' });
        }
        // console.log(token)
        req.user = decoded;
        next();

    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5jqcqmr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("BlogDB");
        const blogsCollection = database.collection("blogs");
        const wishlistCollection = database.collection("wishlist");
        const commentsCollection = database.collection("comments");
 


        app.post("/jwt", async (req, res) => {

            const user = req.body;
            console.log("logging In" + JSON.stringify(user));


            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });


            res.cookie('token', token, {

                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });

        })
        app.post("/logout", async (req, res) => {

            const user = req.body;
            // console.log("logging out" + user);

            res .clearCookie('token', { maxAge: 0, sameSite: 'none', secure: true })
          .send({ success: true })

        })
        app.get("/blogs", async (req, res) => {

            // console.log("called get blogs")
            const cursor = blogsCollection.find();
            const result = await cursor.toArray();
            res.send(result)

        })
        app.get("/getComments/:id", async (req, res) => {

            // console.log("get category: ", req.params.id)
            const getCommentId = req.params.id;
          

                const query = { id: getCommentId }

                const result = await commentsCollection.find(query).toArray();
             
                res.send(result);
          
        })

        app.get("/categoryBlogs/:category", async (req, res) => {

            console.log("get category: ", req.params.category)
            const getBlogByCategory = req.params.category;
            if (getBlogByCategory !== "all") {

                const query = { category: getBlogByCategory }
                const options = {
                    // Include only the `title` and `imdb` fields in the returned document
                    projection: { title: 1, category: 1, short: 1, long: 1, image: 1 },
                };

                const result = await blogsCollection.find(query, options).toArray();
                res.send(result);
            } else {
                const cursor = blogsCollection.find();
                const result = await cursor.toArray();
                res.send(result)
            }


        })

        app.post("/blogs", async (req, res) => {


            // console.log(req.body);


            const blog = req.body;
            const result = await blogsCollection.insertOne(blog);
            res.send(result);

         

        })
        app.post("/wishlist", async (req, res) => {

            const blog = req.body;
            const result = await wishlistCollection.insertOne(blog);
            res.send(result);

            console.log(result);

        })
        app.post("/comments", async (req, res) => {

            const blog = req.body;
            const result = await commentsCollection.insertOne(blog);
            res.send(result);

     

        })
        app.put("/blogUpdate/:id", async (req, res) => {

            const updatedBlogId = req.params.id;
            const updated = req.body;

            // console.log("blog to update", updatedBlogId)

            const filter = { _id: new ObjectId(updatedBlogId) }

            const options = { upsert: true };

            const updateBlog = {
                $set: {
                    title: updated.title,
                    category: updated.category,
                    image: updated.image,
                    short: updated.short,
                    long: updated.long,
                    dateTime: updated.dateTime,

                },
            };

            const result = await blogsCollection.updateOne(filter, updateBlog, options);

            res.send(result);
        })
        app.get("/blog/:id",verifyToken,async (req, res) => {

            // console.log("get id: ", req.params.id)
            const getBlogDetails = req.params?.id;
            const queryEmail = req.query?.email;
            console.log("requested user:" + queryEmail,req.user.email)

            if (req.user?.email !== queryEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { _id: new ObjectId(getBlogDetails) }
            const options = {
              
                projection: { title: 1, category: 1, short: 1, long: 1, image: 1,userImage:1,userName:1,dateTime:1,userMail:1 },
            };

            const result = await blogsCollection.find(query, options).toArray();
            res.send(result);
        })
        
        app.get("/userWishlist/:email", verifyToken, async (req, res) => {


            console.log("get id: ", req.params.email)
            const getUserEmail = req.params.email;


            console.log("queryUser" +req.user?.email)
            console.log('token owner info', req.user)
            if (req.user?.email !== getUserEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: getUserEmail }
            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, category: 1, short: 1, image: 1 },
            };

            const result = await wishlistCollection.find(query, options).toArray();
            res.send(result);
        })

        app.delete("/blog/:id", async (req, res) => {


            const deleteBlog = req.params.id;

            const query = { _id: new ObjectId(deleteBlog) };

            const result = await wishlistCollection.deleteOne(query);
            res.send(result)



        });


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get("/", (req, res) => {
    res.send("Blog server is running");
})


app.listen(port, () => {

    console.log(`server is running on port ${port}`)
})