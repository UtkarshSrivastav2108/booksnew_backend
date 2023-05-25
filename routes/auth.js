const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middlewares/auth");
const authMiddleware = require("../middlewares/auth");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const fs = require("fs");
let multer = require("multer");
let uuidv4 = require("uuid");
const books = require("../Data/books.json");
var jwtSecret = "mysecrettoken";
const { ObjectId } = require("mongoose").Types;

function getRandomIndices(max, count) {
	const indices = [];
	for (let i = 0; i < count; i++) {
		let index;
		do {
			index = Math.floor(Math.random() * max);
		} while (indices.includes(index));
		indices.push(index);
	}
	return indices;
}

router.get("/gettheapidata", (req, res) => {
	res.json(["Tony", "Lisa", "Michael", "Ginger", "Food"]);
});



// @route   POST /users
// @desc    Register user
// @access  Public
router.post(
	"/",
	[
		check("name", "Name is required").not().isEmpty(),
		check("email", "Please include a valid email").isEmail(),
		check(
			"password",
			"Please enter password with 6 or more characters"
		).isLength({ min: 6 }),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { name, email, password } = req.body;

		try {
			// See if user exists
			let user = await User.findOne({ email });

			if (user) {
				res.status(400).json({ errors: [{ msg: "User already exists" }] });
			}
			user = new User({
				name,
				email,
				password,
			});

			//Encrypt Password
			const salt = await bcrypt.genSalt(10);

			user.password = await bcrypt.hash(password, salt);

			await user.save();

			//Return jsonwebtoken
			const payload = {
				user: {
					id: user.id,
				},
			};

			jwt.sign(payload, jwtSecret, { expiresIn: 360000 }, (err, token) => {
				if (err) throw err;
				res.json({ token });
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);

// @route   GET /users/auth
// @desc    Get user by token/ Loading user
// @access  Private
router.get('/auth', authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id)
			.select('-password')
			.populate('defaultBooks', ['name', 'category', 'pages', 'imageURL']);

		if (!user) {
			return res.status(404).json({ errors: [{ msg: 'User not found' }] });
		}

		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});


// @route   POST /users/auth
// @desc    Authentication user & get token/ Login user
// @access  Public
router.post(
	"/auth",
	[
		check("email", "Please include a valid email").isEmail(),
		check("password", "Password is required").exists(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		try {
			// See if user exists
			let user = await User.findOne({ email });

			if (!user) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid Credentials" }] });
			}

			const isMatch = await bcrypt.compare(password, user.password);

			if (!isMatch) {
				return res
					.status(400)
					.json({ errors: [{ msg: "Invalid Credentials" }] });
			}

			//Return jsonwebtoken
			const payload = {
				user: {
					id: user.id,
				},
			};

			jwt.sign(payload, jwtSecret, { expiresIn: "5 days" }, (err, token) => {
				if (err) throw err;
				res.json({ token });
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);


router.post(
	"/categories",
	authMiddleware,
	[
		check("categories", "Please select 3 categories").isArray({ min: 3, max: 3 }),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const userId = req.user.id;
		const { categories } = req.body;

		try {
			const user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({ errors: [{ msg: "User not found" }] });
			}

			user.categories = categories;

			const getRandomIndex = (max) => {
				return Math.floor(Math.random() * max);
			};
			const selectedBooks = [];
			const remainingBooks = [];

			// Get two random books from each selected category
			categories.forEach((category) => {
				const categoryBooks = books.filter((book) => book.category === category);
				if (categoryBooks.length < 2) {
					remainingBooks.push(...categoryBooks);
				} else {
					for (let i = 0; i < 2; i++) {
						const randomIndex = getRandomIndex(categoryBooks.length);
						const randomBook = categoryBooks.splice(randomIndex, 1)[0];
						selectedBooks.push(randomBook);
					}
					remainingBooks.push(...categoryBooks);
				}
			});

			// If there are fewer than 5 selected books, select additional books from remaining categories
			while (selectedBooks.length < 5 && remainingBooks.length > 0) {
				const randomIndex = getRandomIndex(remainingBooks.length);
				const randomBook = remainingBooks.splice(randomIndex, 1)[0];
				selectedBooks.push(randomBook);
			}

			// Trim the selected books array to ensure it contains only 5 books
			if (selectedBooks.length > 5) {
				selectedBooks.length = 5;
			}

			user.defaultBooks = selectedBooks;
			await user.save();
			res.json({ msg: "Categories and default books saved successfully" });
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);







router.get("/mybooks", authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("defaultBooks");

		if (!user) {
			return res.status(404).json({ errors: [{ msg: "User not found" }] });
		}

		res.json(user.defaultBooks);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});


router.get('/coin', authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select('coin');

		if (!user) {
			return res.status(404).json({ errors: [{ msg: 'User not found' }] });
		}
		res.json({ coin: user.coin });
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server error');
	}
});



// @route   PUT /users
// @desc    Update user details
// @access  Private
router.put(
	"/update",
	authMiddleware,
	async (req, res) => {
		const { name, email, password } = req.body;
		const userId = req.user.id;
		try {
			let user = await User.findById(userId);
			if (!user) {
				return res.status(404).json({ errors: [{ msg: "User not found" }] });
			}
			if (name) {
				user.name = name;
			}
			if (email) {
				user.email = email;
			}
			if (password) {
				const salt = await bcrypt.genSalt(10);
				user.password = await bcrypt.hash(password, salt);
			}
			await user.save();
			res.json({ msg: "User details updated successfully" });
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server error");
		}
	}
);




router.put("/updatecoin", authMiddleware, async (req, res) => {
	const { coin } = req.body;
	try {
		const user = await User.findById(req.user.id);
		if (!user) {
			return res.status(404).json({ errors: [{ msg: "User not found" }] });
		}
		user.coin = coin;
		await user.save();
		res.json({ msg: "Coin value updated successfully" });
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// @route   POST /users/mybooks
// @desc    Add a book to user's collection
// @access  Private
router.post("/addmorebooks", authMiddleware, async (req, res) => {
	try {
		const { bookId, bookData } = req.body;
		const userId = req.user.id;

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ errors: [{ msg: "User not found" }] });
		}

		// Check if the book is already in the user's collection
		if (user.myBooks.some((book) => book.bookId.toString() === bookId)) {
			return res
				.status(400)
				.json({ errors: [{ msg: "Book already in user's collection" }] });
		}

		// Add the book to the user's collection with the provided book data
		user.myBooks.push({
			bookId,
			name: bookData.name,
			category: bookData.category,
			pages: bookData.pages,
			imageURL: bookData.imageURL,
			bookURL: bookData.bookURL,
		});
		await user.save();

		res.json({ msg: "Book added to user's collection successfully" });
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});




module.exports = router;