const messages=[]

export function addMessage(msg){
    messages.push(msg)

    if (messages.length>100) {
        messages.shift()
    }
}

export function getMessages(){
    return messages
}