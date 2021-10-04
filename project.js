import axios from 'axios';
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors';


const url = "mongodb://localhost:27017/";
const uri = "mongodb+srv://anhydrous:JO0437anhydrous@cluster0.u7pbz.mongodb.net/apiDatabase?retryWrites=true&w=majority";

mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
})
.then(() => console.log('Mongodb Database is Connected'))

import Record from './models/record.js'
import History from './models/history.js'



const data_url = 'https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&rows=3000&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnection'
let data;
let records;

const app = express();
const port = 3000;

app.use(cors())

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  program1();
  setInterval(program2, 1000000)
  program2();
  program3();
  search('tan');
  ratio();
})

const program1 = async () => {
  return axios.get(data_url)
  .then(response => {
    data = response.data;
    records = response.data.records.map(record => {
      return {
          station_id: record.recordid, 
          station_name: record.fields.nom,
          tpe: record.fields.type === 'AVEC TPE',
          adresse: { city: record.fields.commune , street: record.fields.adresse },
          total_bikes: (record.fields.nbplacesdispo + record.fields.nbvelosdispo),
          geometry: {
            type: record.geometry.type,
            coordinates: record.geometry.coordinates
          }
      }
    })
    const history_data = response.data.records.map(record => {
      return {
          bikes_available: record.fields.nbvelosdispo, 
          stands_available: record.fields.nbplacesdispo,
          is_operating: record.fields.etat === 'EN SERVICE',
          is_connected: record.fields.etatconnexion === 'CONNECTED',
          date: new Date(record.fields.datemiseajour),
          station_id: record.recordid,
        }
    })
    console.log(` Data Fetched.... ${data.records.filter(rec => rec.datasetid === "vlille-realtime").length} records found`);
    return {
      records: records,
      history_data: history_data
    };
  })
  .catch(error => {
    console.log(error)
  })
}

const program2 = async () => {
  program1().then(response => {
    Record.deleteMany().then(() => console.log('Records cleared'))
    Record.insertMany(response.records).then(res =>
      console.log('Records Refreshed')
    ).catch(err => console.log(err))
    History.insertMany(response.history_data).then(res =>
      console.log('History Updated')
    ).catch(err => console.log(err))
  });
}

const program3 = async () => {
  program1()
  .then(() => {
    Record.find(
      {
        geometry: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [ 3.0575024, 50.6288697 ]
            },
            $maxDistance: 300,
            $minDistance: 0
          }
        }
      },
      '-_id station_name'
    )
    .then(res => {
      console.log(res)
    })
    .catch(err => {
      console.log(err)
    })
  })
  .catch(error => console.log(error));
}



const search = (search_string) => {
  const search_string_to_uppercase = search_string.toUpperCase();
  Record.find({"station_name": {$regex: search_string_to_uppercase}}, '-_id station_name')
  .then(res => {
    console.log(res)

  })
  .catch(err => {
    console.log(err)
  })
}

const deactivate = () => {
  Record.updateMany({}, {$set: { tpe: false}})
  .then(res => {
    console.log(res)

  })
  .catch(err => {
    console.log(err)
  })
}

const ratio = () => {
  let ratioData={};
  History.find({})
  .then(res => {
   // console.log(res)

    res.forEach(data=>{
    let singleRation = data.bikes_available/data.stands_available;
    if(singleRation<0.2){
     console.log(new Date(data.date).getTime());
     
    }
     
    })



  })
  .catch(err => {
    console.log(err)

  })}
