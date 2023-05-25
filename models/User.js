const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	avatar: {
		type: String,
	},
	categories: {
		type: [String],
	},
	defaultBooks: {
		type: [
			{
				_id: {
					type: Schema.Types.ObjectId,
					default: mongoose.Types.ObjectId,
				},
				name: String,
				category: String,
				id: Number,
				pages: Number,
				imageURL: String,
				bookUrl: String,
			},
		],
	},
	coin: {
		type: Number,
		default: 100,
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
