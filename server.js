const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const app = express();
const cors = require("cors");
const port = 3000;
const knex = require("knex");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "metin2alaska",
    database: "tudor-ml",
  },
});

app.get("/", (req, res) => {
  res.send("success");
});

app.post("/signin", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json("Check email and password and try again");
  }
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((error) => res.status(400).json("Unable to get user"));
      } else res.status(400).json("Check email and password and try again");
    })
    .catch((error) => res.status(400).json("Error while logging in"));
});

app.post("/register", (req, res) => {
  const { name, password, email } = req.body;
  if (!name || !password || !email) {
    return res.status(400).json("Incorrect form submission");
  }
  const hash = bcrypt.hashSync(password);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date(),
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((error) => res.status(400).json("Unable to register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("users")
    .where({ id })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("Not found");
      }
    })
    .catch((err) => res.status(400).json("Error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => res.json(entries[0]))
    .catch((error) => res.status(400).json("Unable to get entry count"));
});

app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
