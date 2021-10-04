import axios from 'axios';
import mongoose from 'mongoose'
import express from 'express'
import cors from 'cors';
import readline from 'readline'
import Record from './models/record.js'
import History from './models/history.js'

const uri = "mongodb+srv://anhydrous:JO0437anhydrous@cluster0.u7pbz.mongodb.net/apiDatabase?retryWrites=true&w=majority";

mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
})
.then(() => console.log('Mongodb Database is Connected'))


const data_url = 'https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&rows=3000&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnection'
let data;
let records;

const app = express();
const port = 3000;

app.use(cors())

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  start();
})
const start = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
   
  rl.question(`Please select a program and press enter 
  \n1. Get Data from API
  \n2. Refresh and store live data
  \n3. Find stations available
  \n4. Business Program - Search by name
  \n5. Business Program - Update
  \n6. Business Program - Deactivate station
  \n7. Business Program - Find ratio given a time range
  \n8. Business Program - Delete
  `, number => {
    switch (number) {
      case '1': 
        console.log(`You selected program ${number}`);
        console.log(`Get Data from API`);
        program1()
        break
      case '2': 
        console.log(`You selected program ${number}`);
        console.log(`Refresh and store live data`);
        setInterval(program2, 1000)
        break
      case '3': 
        console.log(`You selected program ${number}`);
        console.log(`Find stations available`);
        const long = 3.0575024;
        const lat = 50.6288697;
        program3([long, lat])
        break
      case '4': 
        console.log(`You selected program ${number}`);
        console.log(`Business Program - Search by name`);
        search('TAN')
        break
      case '5': 
        console.log(`You selected program ${number}`);
        console.log(`Business Program - Update Station`);
        update_station('RUE ROYALE', 'RUE ROYALES')
        break
      case '6': 
        console.log(`You selected program ${number}`);
        console.log(`Business Program - Deactivate station`);
        deactivate('DE GAULLE')
        break
      case '7': 
        console.log(`You selected program ${number}`);
        console.log(`Business Program - Find ratio given a time range`);
        ratio()
        break
      case '8': 
        console.log(`You selected program ${number}`);
        console.log(`Business Program - Delete Station`);
        delete_station()
        break
      default:
        rl.close();
        start();
    }
    rl.close();
  });
}

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

const program3 = async (coordinates) => {
  program1()
  .then(() => {
    Record.find(
      {
        geometry: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: coordinates
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

const delete_station = (station_name) => {
  Record.findOne({"station_name": station_name})
  .then(res => {
    if(res){
      Record.deleteOne({'station_id': res.station_id}).then(() => { console.log('Deleted from Records')}).catch( err => { console.log(err)})
      History.deleteMany({'station_id':res.station_id}).then(() => { console.log('Deleted from History')}).catch( err => { console.log(err)})
    }
    else{
      console.log('No station found')
    }

  })
  .catch(err => console.log(err))
}

const update_station = (station_name,new_station_name) => {
  Record.findOne({"station_name": station_name})
  .then(res => {
    if(res){
      Record.updateOne(
        {'station_id': res.station_id},
        {$set:{'station_name': new_station_name}}
      )
      .then(() => {console.log(`Station ${station_name} updated to ${new_station_name}`)})
      .catch(err => { console.log(err)})
    }
    else {
      console.log('No station found')
    } 
   })
  .catch(err => console.log(err))
}

const deactivate = (station_name) => {
  let station_geo_point;
  Record.findOne({"station_name": station_name}, '-_id geometry.coordinates')  
  .then(res => {
    console.log(res.geometry.coordinates)
    station_geo_point = res.geometry.coordinates;

    Record.find({
      'geometry':{
          '$geoWithin':{
              '$center':[station_geo_point,0.008],
          }
      }
    })
    .then(response => {
      console.log(response)
      response.forEach(station => {
        Record.updateMany({ station_id: station.station_id }, {$set: { tpe: false}})
        .then(() => {
          console.log("Deactivated")
        })
        .catch(err => {
          console.log(err)
        })
      });
    })
    .catch(err => {
      console.log(err)
    })
  })
  .catch(err => {
    console.log(err)
  })
}

const ratio = async () => {
  History.find( 
    { $expr: 
      { 
        $lt: [ 
          {$divide: ["$bikes_available", { $cond: [ { $eq: [ {$add: ["$stands_available", "$bikes_available"]}, 0 ] }, 1,  {$add: ["$stands_available", "$bikes_available"]}]}]},
          0.2
        ] 
      },
      "date": {
        $gte:"2021-10-04T16:12:11.000+00:00",
        $lt: "2021-10-04T17:06:15.000+00:00"
      }
    }
  )
  .then(res => {
   console.log(res)
   console.log(`${res.length} stations found`)
  })
  .catch(err => {
    console.log(err)
  })
}
