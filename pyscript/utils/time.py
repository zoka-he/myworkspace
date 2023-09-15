import datetime  

def nowDate(format):  
    current_date = datetime.datetime.now()  
    formatted_date = current_date.strftime(format)  
    return formatted_date  