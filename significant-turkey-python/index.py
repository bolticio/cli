# Import the required modules
from flask import jsonify

# Define the handler function
def handler(request):
    # Create the response JSON
    response_json = {
        'message': 'Hello World'
    }

    # Print the JSON response to stdout
    print(response_json)

    # Return a JSON response
    return jsonify(response_json)
