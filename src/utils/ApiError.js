class ApiError extends Error{
    constructor(
        statusCode,
        message="Something Went wrong",
        errors=[],
        statck=""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.error = errors

        if(statck){
            this.statck = statck
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}


export {ApiError}