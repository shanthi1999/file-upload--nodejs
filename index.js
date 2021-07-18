const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");

const app = express();

// Middleware
app.use(methodOverride("_method"));

// Mongo URI
const mongoURI =
  "mongodb+srv://fileupload:fileupload@cluster0.fhj3m.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
});

// Init gfs
let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });

// @route POST /upload
// @desc  Uploads file to DB
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: req.file });
});

//giving all files
app.get("/download", (req, res) => {
  gfs.files.find().toArray((err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }
    return res.json(file);
  });
});

// fetching particular file with name
app.get("/download/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }
    return res.json(file);
  });
});

// displaying file to the browser
app.get("/images/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }
    if (file.contentType == "image/jpeg" || file.contentType == "img/png") {
      //Read output to the browser
      const readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image"
      });
    }
  });
});

//deleting the particular image

app.delete("/image/:id", async (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      res.status(404).json({ err: err });
    }
    res.json({
       data:"data successfully deleted"
    })
  });
});
const port = 8000;

app.listen(port, () => console.log(`Server started on port ${port}`));
