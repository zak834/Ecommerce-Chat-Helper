import 'dotenv/config'
import express , {Express, Request, Response} from 'express'
import {MongoClient} from 'mongodb'
import {calAgent} from './agent'

const app: Express = express()

import cors from 'cors'
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string)

async function startServer (){
    try{
        await client.connect()
        await client.db("admin").command({ping: 1})
        console.log("You successfully connected to MongoDB!")

        app.get('/',(req: Request, res: Response) => {
            res.send('LangGrapg Agent Server')
        })

        app.post('/chat', async (req: Request, res: Response) => {
            const initialMessage = req.body.message
            const threadId = Date.now().toString()
            console.log(initialMessage)

            try {
                const response = await calAgent(client, initialMessage, threadId)
                res.json({threadId, response})
                
            } catch (error) {
                console.error('Error starting conversation:', error)
                res.status(500).json({error: 'Failed to start conversation'})
                
            }
        })

        app.post('/chat/:threadId', async (req: Request, res: Response) => {
            const {threadId} = req.params
            const {message} = req.body
            

        })

    } catch (error){
        console.error(error)
    }
}