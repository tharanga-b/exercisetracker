const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require("mongoose");
const { isNull, isNumber } = require('util')
const { model, Schema } = mongoose;

require('dotenv').config()

const connection_url =
	"mongodb+srv://user:cTMOUMhPi7EyIoZE@cluster0.3q5a84c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const userScheme = {
	userName: { type: String, required: true },
}
const exerciseScheme = {
	userId: { type: String, required: true },
	userName: { type: String, required: true },
	logs: [
		{
			description: { type: String, required: true },
			duration: { type: Number, required: true },
			date: { type: Date, required: true }
		}
	]
}

const userModel = model('user', userScheme);
const exerciseModel = model('exercise', exerciseScheme)


const cn = mongoose.connect(connection_url);

app.use(cors())
app.use(bodyParser({ type: 'application/*+json' }))
app.use(express.static('public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});


app.get('/api/users',async function(req,res){
	let users = await userModel.find()
	console.log(users)
	//users = users.map(user=>({_id:user._id,username: user.userName}))
	res.json(users)
})

app.post('/api/users', async function(req, res) {
	const userName = req.body.username;

	try {
		let data = await userModel.findOne({ userName })
		if (isNull(data)) {
			const createData = await userModel.create({ userName })
			res.json({
				username: createData.userName,
				_id: createData._id
			})
		} else {
			res.json({ error: 'user name excists' })
		}
	} catch (e) {
		console.log(e)
	}
})

app.post('/api/users/:_id/exercises', async function(req, res) {

	const id = req.body[':_id'];
	const description = req.body.description;
	const duration = parseFloat(req.body.duration);
	let date = Date.parse(req.body.date)
	if (date === NaN) date = new Date()

	// validation 
	if (!isNumber(duration)) res.json({ message: 'Duration should be in mins' })

	try {

		let userData = await userModel.findById(id)
		if (!isNull(userData)) {
			const userDetails = await userModel.findById(id)
			if (isNull(userDetails)) {
				res.json({ message: "user doesn't excists" })
			} else {
				const findUser = await exerciseModel.findOne({ userId: id })
				if (isNull(findUser)) {
					console.log(date)
					exerciseModel.create({
						userId: id,
						userName: userData.userName,
						logs: [
							{
								description, duration, date: date ? date : new Date()
							}
						]
					})
				} else {
					findUser.logs.push({
						description, duration, date: date ? date : new Date()
					})
					await findUser.save()
				}
			}
			res.json({ message: 'Log has been created' })
		} else {
			res.json({ error: 'user name does not excists.' })
		}
	} catch (e) {
		console.log(e)
	}
})


/// logs 
app.get("/api/users/:_id/logs", async function(req, res) {
	let id = req.params._id;
	let { from, to, limit } = req.query;
	const data = await exerciseModel.findOne({ userId: id });
	let { logs } = data;
	if (data) {
		if (to) {
			logs = logs.filter((singleLog) => {
				return new Date(singleLog.date) <= new Date(to);
			})
		};

		if (from) {
			logs = logs.filter((singleLog) => {
				return new Date(singleLog.date) >= new Date(from);
			})
		};


		if (limit) {
			logs = logs.slice(0, limit);
		};

		logs = logs.map((log) => {
			return {
				duration: log.duration,
				date: log.date,
				description: log.description,
			}
		});

		res.json({
			username: data.userName,
			count: logs.length,
			_id: data.userId,
			log: logs,
		})


	} else {
		res.json({
			'message': 'logs are unavailable'
		})
	}
	
})



const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})
