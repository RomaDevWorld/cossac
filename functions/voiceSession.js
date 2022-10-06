var sessions = {}

module.exports = async function(id, log, type, msg) {
    if(type === 0){
        //Create a session, export msg
        sessions[`${log.guild.id}_${id}`] = {
            message: msg.id,
            joined: Date.now()
        }
    }else if(type === 1){
        //Export msg
        let message = await log.messages.fetch(sessions[`${log.guild.id}_${id}`].message)
        if(message) return message
    }else{
        //Delete session, export msg, time
        let message = await log.messages.fetch(sessions[`${log.guild.id}_${id}`].message)
        if(message) return { message: message, time: sessions[`${log.guild.id}_${id}`].joined }
        delete sessions[`${log.guild.id}_${id}`]
    }
}   