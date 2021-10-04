import mongoose from 'mongoose'
const HistorySchema = new mongoose.Schema({
    bikes_available: Number, 
    stands_available: Number,
    is_operating: Boolean,
    is_connected: Boolean,
    date: Date,
    station_id: String,
});
export default mongoose.model('History', HistorySchema);