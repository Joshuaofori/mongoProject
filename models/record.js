import mongoose from 'mongoose'

const pointSchema = new mongoose.Schema({
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  });

const RecordSchema = new mongoose.Schema({
    station_id: String,
    station_name: String, 
    tpe: Boolean,
    adresse: { city: String, street: String },
    total_stands: Number,
    geometry: {    
        type: pointSchema,
        index: '2dsphere',
    },
});

export default mongoose.model('Record', RecordSchema);