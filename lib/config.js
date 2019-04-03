/**
 * Create and export configuration variables
 * 
 */


 // Container for all the environments
var environments = {};


// Staiging (default) environment
environments.staiging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staiging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'stripeApiKey':'pk_test_LdPIFTincD9hPcKcKxX5GcZk00XSvPT38L'
};


// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsAlsoASecret',
    'maxChecks': 5,
    'stripeApiKey': 'pk_test_LdPIFTincD9hPcKcKxX5GcZk00XSvPT38L'
};

// Detwermine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staiging;

// Export the module
module.exports = environmentToExport;
