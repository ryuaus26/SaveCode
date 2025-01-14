const firebaseConfig = {
    apiKey: "AIzaSyB5pHK1U6Oy5Ta9oPOcL5LfWXGP_U3838E",
    authDomain: "liftascend.firebaseapp.com",
    projectId: "liftascend",
    storageBucket: "liftascend.appspot.com",
    messagingSenderId: "403461421933",
    appId: "1:403461421933:web:52452b598fb853c3cb3864",
    measurementId: "G-RFR3H01R2N"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize variables
const auth = firebase.auth();
const database = firebase.database();



async function loadPercentileData(filepath) {
    try {
        const response = await fetch(filepath);
        const data = await response.json();
        console.log("Loaded JSON data structure:", data); // Debug log
        return data;
    } catch (error) {
        console.error("Error loading percentile data:", error);
        throw error;
    }
}



// Helper function to normalize gender string
function normalizeGender(gender) {
    gender = gender.toLowerCase().trim();
    return gender === 'male' || gender === 'm' ? 'male' : 
           gender === 'female' || gender === 'f' ? 'female' : gender;
}


// Helper function to determine the user's percentile based on their lift with interpolation
function getPercentile(lift, liftData) {
    // Convert liftData keys to integers and sort them
    const percentiles = Object.keys(liftData).map(Number).sort((a, b) => a - b);
    
    // Check if the lift exceeds the highest in the data
    if (lift >= liftData[percentiles[percentiles.length - 1]]) {
        return 100; // If the lift exceeds the highest percentile
    }

    // Find the closest weights below and above the user's lift
    let lowerWeight = null;
    let upperWeight = null;

    for (const percentile of percentiles) {
        if (liftData[percentile] < lift) {
            lowerWeight = percentile; // this is a lower bound
        } else if (liftData[percentile] >= lift && upperWeight === null) {
            upperWeight = percentile; // this is an upper bound
            break;
        }
    }

    // If lowerWeight is null, it means the user's lift is below all
    if (lowerWeight === null) {
        return percentiles[0]; // The lowest percentile
    }

    // Perform linear interpolation to find the exact percentile
    const lowerValue = liftData[lowerWeight];
    const upperValue = liftData[upperWeight];

    const percentile = lowerWeight + ((lift - lowerValue) * (upperWeight - lowerWeight)) / (upperValue - lowerValue);
    
    return Math.round(percentile);
}



// Function to display the user's percentile
async function displayUserStrengthComparison(squat, bench, deadlift, userCategory) {
    const userPercentiles = await calculateUserPercentile(squat, bench, deadlift, userCategory);
    

    alert(
        "You are:\n" +
        `- ${userPercentiles.squat}% stronger than others in your category for squat.\n` +
        `- ${userPercentiles.bench}% stronger than others in your category for bench press.\n` +
        `- ${userPercentiles.deadlift}% stronger than others in your category for deadlift.`
      );
      
}





// Function to add a new row to the lift data table
function addRow() {
    const tbody = document.getElementById('liftDataBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="number" class="age w-full p-2 border rounded" placeholder="Age"></td>
                    <td><input type="number" class="weight w-full p-2 border rounded" placeholder="Weight"></td>
                                            <td>
                            <select class="gender w-full p-2 border rounded">
                                <option value="" disabled selected>Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </td>
                    <td><input type="number" class="squat w-full p-2 border rounded" placeholder="Squat"></td>
                    <td><input type="number" class="bench w-full p-2 border rounded" placeholder="Bench"></td>
                    <td><input type="number" class="deadlift w-full p-2 border rounded" placeholder="Deadlift"></td>
                    <td><button onclick="removeRow(this)" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300">Remove</button></td>
    `;
    tbody.appendChild(newRow);
}

// Function to remove a row from the lift data table
function removeRow(button) {
    const row = button.closest('tr');
    row.remove();
}

// Function to clear the lift data table
function clearLiftDataTable() {
    const tbody = document.getElementById('liftDataBody');
    tbody.innerHTML = ''; // Clear all rows
    addRow(); // Add one empty row
}
function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    
    // Validate inputs
    

    if (!validate_email(email) || !validate_password(password)) {
        alert('Email or Password is invalid!');
        return;
    }
    
    // Show loading state

    
    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            const user = userCredential.user;
            const database_ref = database.ref();

            // Update last login
            const user_data = {
                last_login: Date.now()
            };

            // First, update the last login
            return database_ref.child('users/' + user.uid).update(user_data)
                .then(() => {
                    // Then fetch the user data
                    return database_ref.child('users/' + user.uid).once('value');
                });
        })
        .then(function(snapshot) {
            const user_info = snapshot.val();
            const loginBtn = document.getElementById('login-btn');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            // Check if user info exists
            if (!user_info || !user_info.name) {
                window.location.href = "index.html";  // Redirect if user info is incomplete
                throw new Error('User data not found');
            }

            // Redirect to loggedin.html if everything is correct
            window.location.href = "loggedin.html"; // Correct the redirection
           
        })
        .catch(function(error) {
            console.error("Login error:", error);
            
            // Show user-friendly error messages
            let errorMessage;
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    window.location.href = "index.html";  // Correct
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    window.location.href = "index.html";  // Correct
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later';
                    window.location.href = "index.html";  // Correct
                    break;
                default:
                    errorMessage = error.message === 'Name verification failed' 
                    
                        ? 'The name you entered does not match our records'
                        : 'An error occurred during login. Please try again';
                        window.location.href = "index.html";  // Correct
            }
            

            alert(errorMessage);
        })
        .finally(() => {
            // Reset button state
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        });
}

// Helper function to prevent multiple form submissions
function preventMultipleSubmits(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.submitted) {
                this.submitted = true;
                login();
            }
        });
    }
}
  
  
  
  async function register() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const full_name = document.getElementById('full_name').value;
      
      if (!validate_email(email) || !validate_password(password)) {
          alert('Email or Password is invalid!');
          return;
      }
    
      if (!validate_field(full_name)) {
          alert('Full Name is invalid!');
          return;
      }
      
      try {
          const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
          const user = userCredential.user;
          const lastFiveChars = user.uid.slice(-5);
          const user_data = {
              email: email,
              full_name: full_name + " " + lastFiveChars,
              name: full_name,
              last_login: Date.now(),
          };
  
          // Save the user data directly under the user's UID in the database
          await firebase.database().ref('users/' + user.uid).set(user_data);
          
          alert('User Created!');
          window.location.href = "index.html";
      } catch (error) {
          console.error("Error during registration:", error);
          alert(error.message);
      }
  }
  
  
  // Validate Functions
  function validate_email(email) {
    const expression = /^[^@]+@\w+(\.\w+)+\w$/;
    return expression.test(email);
  }
  
  function validate_password(password) {
    return password.length >= 6;
  }
  
  function validate_field(field) {
    return field != null && field.length > 0;
  }

const csvFilePath = 'http://localhost/LiftAscend/filtered_lifting_data.csv'; // Replace with your actual CSV file path

function submitLiftData() {
    const user = firebase.auth().currentUser;
    const rows = document.querySelectorAll('#liftDataBody tr');
    const liftData = [];
    let totalLiftSum = 0;
    let bodyweight = 0;
    let age = 0;

    rows.forEach((row, index) => {
        // Extract input values from the row
        const ageValue = row.querySelector('.age').value;
        const weight = row.querySelector('.weight').value;
        let gender = row.querySelector('.gender').value;
        const squat = row.querySelector('.squat').value;
        const bench = row.querySelector('.bench').value;
        const deadlift = row.querySelector('.deadlift').value;

        // Check if all required fields are filled
        if (ageValue && weight && gender && squat && bench && deadlift) {
            const totalLift = parseInt(squat) + parseInt(bench) + parseInt(deadlift);
            totalLiftSum += totalLift; // Add to total lift sum
            age = parseInt(ageValue);  // Assign age (assuming one row per session)
            bodyweight = parseInt(weight); // Assign bodyweight (assuming one row per session)
            gender = gender.trim().toLowerCase();

            // Determine weight class based on gender
            let weightClass;
            if (gender === 'male') {
                weightClass = getWeightClassMale(bodyweight, currentWeightUnit);
            } else if (gender === 'female') {
                weightClass = getWeightClassFemale(bodyweight, currentWeightUnit);
            } else {
                alert(`Invalid gender in row ${index + 1}. Please enter 'male' or 'female'.`);
                return;
            }

            // Calculate user's percentiles and determine rank
            const userPercentiles = calculateUserPercentile(
                parseInt(squat),
                parseInt(bench),
                parseInt(deadlift),
                {
                    gender: gender,
                    weightClass: weightClass,
                    ageGroup: getAgeGroup(age)
                }
            );

            // Calculate the average percentile for ranking
            const avgPercentile = (userPercentiles.squat + userPercentiles.bench + userPercentiles.deadlift) / 3;
            const userRank = updateRank(avgPercentile);
            
            // Create the lift object with all details
            const liftObject = {
                age: age,
                weight: bodyweight,
                gender: gender,
                squat: parseInt(squat),
                bench: parseInt(bench),
                deadlift: parseInt(deadlift),
                total: totalLift,
                timestamp: Date.now(),
                unit: currentWeightUnit,
                weightClass: weightClass,
                ageGroup: getAgeGroup(age),
                rank: userRank
            };

            liftData.push(liftObject);

            document.getElementById('total').textContent = totalLiftSum + " " + currentWeightUnit;
            document.getElementById('age').textContent = age;
            document.getElementById('bodyweight').textContent = bodyweight + " " + currentWeightUnit;
        
            // Calculate and display the DOTS score
            const dotsScore = calculateDOTS(bodyweight, totalLiftSum, liftObject.gender === 'male', currentWeightUnit);
            document.getElementById('dots').textContent = dotsScore;
        
            document.getElementById('dots').textContent = dotsScore;

            // Display user strength comparison based on the lift data
            displayUserStrengthComparison(
                parseInt(squat),
                parseInt(bench),
                parseInt(deadlift),
                {
                    gender: gender,
                    weightClass: weightClass,
                    ageGroup: getAgeGroup(age)
                }
            );
        } else {
            alert(`Please fill all fields in row ${index + 1}`);
            return;
        }
      
    });

}

// DOTS Calculation Function
function calculateDOTS(weight, totalLift, isMale, unit) {
    const maleCoeff = [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093];
    const femaleCoeff = [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706];

    let bw = unit === 'lbs' ? weight * 0.453592 : weight;
    let maxbw = isMale ? 210 : 150;
    bw = Math.min(Math.max(bw, 40), maxbw);
    let coeff = isMale ? maleCoeff : femaleCoeff;

    let denominator = coeff[0];
    for (let i = 1; i < coeff.length; i++) {
        denominator += coeff[i] * Math.pow(bw, i);
    }

    let totalKg = unit === 'lbs' ? totalLift * 0.453592 : totalLift;
    let score = (500 / denominator) * totalKg;
    return score.toFixed(2);
}


function getWeightClassMale(weight, unit) {

    if (unit == 'kgs'){
        if (weight <= 52) return '52kg';
        if (weight > 52 && weight <= 56) return '56kg';
        if (weight > 56 && weight <= 60) return '60kg';
        if (weight > 60 && weight <= 67.5) return '67.5kg';
        if (weight > 67.5 && weight <= 75) return '75kg';
        if (weight > 75 && weight <= 82.5) return '82.5kg';
        if (weight > 82.5 && weight <= 90) return '90kg';
        if (weight > 90 && weight <= 100) return '100kg';
        if (weight > 100 && weight <= 110) return '110kg';
        if (weight > 110 && weight <= 125) return '125kg';
        if (weight > 125 && weight <= 140) return '140kg';
        if (weight > 140) return '140kg';
    } else {
        weight = lbsToKg(weight)
        if (weight <= 52) return '52kg';
        if (weight > 52 && weight <= 56) return '56kg';
        if (weight > 56 && weight <= 60) return '60kg';
        if (weight > 60 && weight <= 67.5) return '67.5kg';
        if (weight > 67.5 && weight <= 75) return '75kg';
        if (weight > 75 && weight <= 82.5) return '82.5kg';
        if (weight > 82.5 && weight <= 90) return '90kg';
        if (weight > 90 && weight <= 100) return '100kg';
        if (weight > 100 && weight <= 110) return '110kg';
        if (weight > 110 && weight <= 125) return '125kg';
        if (weight > 125 && weight <= 140) return '140kg';
        if (weight > 140) return '140kg';
    }

    
}

function getWeightClassFemale(weight, unit) {
    
    if (unit == 'kgs'){
        if (weight <= 44) return '44kg';
        if (weight > 44 && weight <= 48) return '48kg';
        if (weight > 48 && weight <= 52) return '52kg';
        if (weight > 52 && weight <= 56) return '56kg';
        if (weight > 56 && weight <= 60) return '60kg';
        if (weight > 60 && weight <= 67.5) return '67.5kg';
        if (weight > 67.5 && weight <= 75) return '75kg';
        if (weight > 75 && weight <= 82.5) return '82.5kg';
        if (weight > 82.5 && weight <= 90) return '90kg';
        if (weight > 90)return '90kg';

    } else {
        weight = lbsToKg(weight)
        if (weight <= 44) return '44kg';
        if (weight > 44 && weight <= 48) return '48kg';
        if (weight > 48 && weight <= 52) return '52kg';
        if (weight > 52 && weight <= 56) return '56kg';
        if (weight > 56 && weight <= 60) return '60kg';
        if (weight > 60 && weight <= 67.5) return '67.5kg';
        if (weight > 67.5 && weight <= 75) return '75kg';
        if (weight > 75 && weight <= 82.5) return '82.5kg';
        if (weight > 82.5 && weight <= 90) return '90kg';
        if (weight > 90)return '90kg';
    }
   
}


function lbsToKg(weight) {
    // Conversion factor: 1 pound is approximately 0.453592 kilograms
    const conversionFactor = 0.453592;
    // Convert the weight
    const weightInKg = weight * conversionFactor;
    return weightInKg;
}


function getAgeGroup(age) {
    if (age < 14) {
        return 'Youth';
    } else if (age >= 14 && age <= 15) {
        return 'Teen1';
    } else if (age >= 16 && age <= 17) {
        return 'Teen2';
    } else if (age >= 18 && age <= 19) {
        return 'Teen3';
    } else if (age >= 35 && age <= 39) {
        return 'Sub-Master';
    } else if (age >= 40 && age <= 49) {
        return 'Master I';
    } else if (age >= 50) {
        return 'Master II';
    } else {
        return 'Open';  // Default for adults between 20 and 34
    }               // Age Range: 50 years and older

}

function updateProfileDisplay(data) {
    document.getElementById('user-bench').textContent = data.bench ? data.bench + ' lbs' : 'N/A';
    document.getElementById('user-squat').textContent = data.squat ? data.squat + ' lbs' : 'N/A';
    document.getElementById('user-deadlift').textContent = data.deadlift ? data.deadlift + ' lbs' : 'N/A';
}


function displayPercentiles(percentiles) {
    const percentileDisplay = {
        squat: document.getElementById('user-squat-percentile'),
        bench: document.getElementById('user-bench-percentile'),
        deadlift: document.getElementById('user-deadlift-percentile')
    };

    for (const [lift, element] of Object.entries(percentileDisplay)) {
        if (element) {
            element.textContent = `${percentiles[lift]}%`;
        } else {
            console.log(`Element for ${lift} percentile not found. Percentile: ${percentiles[lift]}%`);
        }
    }

    // If none of the elements exist, create a new element to display percentiles
    if (!percentileDisplay.squat && !percentileDisplay.bench && !percentileDisplay.deadlift) {
        const percentileContainer = document.getElementById('percentile-content-container');
        document.getElementById("squat-percentile").textContent = " " + percentiles.squat + "%" + " better than others"
        document.getElementById("bench-percentile").textContent = " " + percentiles.bench + "%" + " better than others"
        document.getElementById("deadlift-percentile").textContent = " " + percentiles.deadlift + "%" + " better than others"
       

     
    }
}

// Function to logout
function logout() {
    firebase.auth().signOut()
        .then(() => {
            console.log("User signed out successfully");
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Error signing out:", error);
            alert("An error occurred while logging out. Please try again.");
        });
}

currentWeightUnit = 'lbs'; // Default unit is pounds

// Event listener for clicking outside dropdown
document.addEventListener('click', function(event) {
    const content = document.querySelector('.weight-unit-content');
    const button = document.querySelector('.weight-unit-btn');
    
    if (!button.contains(event.target) && !content.contains(event.target)) {
        content.style.display = 'none';
    }
});

function toggleWeightUnit() {
    const content = document.querySelector('.weight-unit-content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

// Helper functions for conversions
function lbsToKg(lbs) {
    return lbs / 2.2046226218487757;
}

function kgToLbs(kg) {
    return kg *2.2046226218487757;
}

function selectWeightUnit(unit) {
    const weightHeader = document.getElementById('weightHeader');
    const squatHeader = document.getElementById('squatHeader');
    const benchHeader = document.getElementById('benchHeader');
    const deadliftHeader = document.getElementById('deadliftHeader');

    const button = document.getElementById('weightUnitButton');
   
    
    const content = document.querySelector('.weight-unit-content');
    content.style.display = 'none';

    if (unit === 'kgs' && currentWeightUnit !== 'kgs') {
        if ((document.getElementById('total').textContent).trim() === "N/A") {
            document.getElementById('total').textContent = '0 ' + unit
            document.getElementById('bodyweight').textContent = '0 '+ unit
        }
        weightHeader.textContent = 'Weight (kgs)';
        squatHeader.textContent = 'Squat (kgs)';
        benchHeader.textContent = 'Bench (kgs)';
        deadliftHeader.textContent = 'Deadlift (kgs)';
        button.textContent = `${unit} ▼`;
        currentWeightUnit = 'kgs';

        document.getElementById('total').textContent = lbsToKg(parseFloat(document.getElementById('total').textContent)).toFixed(1) + " " + currentWeightUnit;
    
        document.getElementById('bodyweight').textContent = lbsToKg(parseFloat(document.getElementById('bodyweight').textContent)).toFixed(1) + " " + currentWeightUnit;
    
        // Calculate and display the DOTS score
        const dotsScore = calculateDOTS(bodyweight, totalLiftSum, gender === 'male', currentWeightUnit);
     

    } else if (unit === 'lbs' && currentWeightUnit !== 'lbs') {
        if ((document.getElementById('age').textContent).trim() === "N/A") {
            document.getElementById('total').textContent = '0 ' + unit
            document.getElementById('bodyweight').textContent = '0 '+ unit
        }
        weightHeader.textContent = 'Weight (lbs)';
        squatHeader.textContent = 'Squat (lbs)';
        benchHeader.textContent = 'Bench (lbs)';
        deadliftHeader.textContent = 'Deadlift (lbs)';
      
        currentWeightUnit = 'lbs';
        document.getElementById('total').textContent = kgToLbs(parseFloat(document.getElementById('total').textContent)).toFixed(1) + " " + currentWeightUnit;
      
        document.getElementById('bodyweight').textContent = kgToLbs(parseFloat(document.getElementById('bodyweight').textContent)).toFixed(1) + " " + currentWeightUnit;
    }
}

async function loadPercentileData(filepath) {
    try {
        const response = await fetch(filepath);
        const data = await response.json();
        console.log("Loaded JSON data structure:", data);
        return data;
    } catch (error) {
        console.error("Error loading percentile data:", error);
        throw error;
    }
}


// Check if the user is signed in
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User is signed in, delay redirection by 500 milliseconds
      setTimeout(() => {
        window.location.href = 'loggedin.html';
      }, 1000);
    } 
  });
  

async function calculateUserPercentile(squat, bench, deadlift, userCategory) {
    const percentilesData = await loadPercentileData('percentile.json');
    
    const weightClassNum = userCategory.weightClass.replace('kg', '');
    let formattedWeightClass = weightClassNum.endsWith('.5') ? weightClassNum : weightClassNum + ".0";
    
   

    const ageGroupMapping = {
        'Youth': 'Open',
        'Teen1': 'Teen1',
        'Teen2': 'Teen2',
        'Teen3': 'Teen3',
        'Sub-Master': 'Sub-Master',
        'Master I': 'Master I',
        'Master II': 'Master II'
    };

    const mappedAgeGroup = ageGroupMapping[userCategory.ageGroup] || 'Open';
    const weightClassData = percentilesData[userCategory.gender]?.[formattedWeightClass]?.[mappedAgeGroup];
    
    console.log("Weight Class Data:", weightClassData);
    console.log("Current Weight Unit:", currentWeightUnit);
    console.log("Original values - Squat:", squat, "Bench:", bench, "Deadlift:", deadlift);

    if (!weightClassData) {
        console.error("No data found for the given user category:", {
            original: userCategory,
            mapped: {
                gender: userCategory.gender,
                weightClass: formattedWeightClass,
                ageGroup: mappedAgeGroup
            }
        });
        return { squat: 0, bench: 0, deadlift: 0 };
    }

    // Convert input values to kg if they're in lbs
    const squatKg = currentWeightUnit === 'lbs' ? lbsToKg(squat) : squat;
    const benchKg = currentWeightUnit === 'lbs' ? lbsToKg(bench) : bench;
    const deadliftKg = currentWeightUnit === 'lbs' ? lbsToKg(deadlift) : deadlift;

    console.log("Converted values (kg) - Squat:", squatKg, "Bench:", benchKg, "Deadlift:", deadliftKg);

    function findPercentileFromBrackets(value, brackets) {
        const percentiles = Object.keys(brackets).map(Number).sort((a, b) => a - b);
        const values = percentiles.map(p => brackets[p]);
        
        if (value < values[0]) {
            const slope = percentiles[0] / values[0];
            return Math.max(0, value * slope);
        }
        
        if (value >= values[values.length - 1]) {
            const lastPercentile = percentiles[percentiles.length - 1];
            const remainingPercentile = 100 - lastPercentile;
            const exceedance = value - values[values.length - 1];
            const scale = remainingPercentile / (values[values.length - 1] * 0.1);
            return Math.min(100, lastPercentile + (exceedance * scale));
        }
        
        for (let i = 0; i < values.length - 1; i++) {
            if (value >= values[i] && value < values[i + 1]) {
                const lowerValue = values[i];
                const upperValue = values[i + 1];
                const lowerPercentile = percentiles[i];
                const upperPercentile = percentiles[i + 1];
                
                const position = (value - lowerValue) / (upperValue - lowerValue);
                const t = position;
                const smoothPosition = t * t * (3 - 2 * t);
                
                return lowerPercentile + (smoothPosition * (upperPercentile - lowerPercentile));
            }
        }
        
        return 100;
    }

    const results = {
        squat: Number(findPercentileFromBrackets(squatKg, weightClassData.Best3SquatKg).toFixed(2)),
        bench: Number(findPercentileFromBrackets(benchKg, weightClassData.Best3BenchKg).toFixed(2)),
        deadlift: Number(findPercentileFromBrackets(deadliftKg, weightClassData.Best3DeadliftKg).toFixed(2))
    };

    console.log("Calculated percentiles:", results);
    return results;
}

// Helper function to format percentile for display
function formatPercentile(percentile) {
    return Number(percentile).toFixed(2);
}

async function displayUserStrengthComparison(squat, bench, deadlift, userCategory) {
    const userPercentiles = await calculateUserPercentile(squat, bench, deadlift, userCategory);
    
    if (typeof displayPercentiles === 'function') {
        displayPercentiles(userPercentiles);
    }

    

    const avgPercentile = (userPercentiles.squat + userPercentiles.bench + userPercentiles.deadlift) / 3;
    const userRank = updateRank(avgPercentile);

    console.log(avgPercentile)
    displayRank(userRank);
}
function keepRank(userRank) {
    return userRank;
}
// Adjusted rank logic
function updateRank(percentile) {
    console.log(percentile)
    if (percentile >= 80) {
        return "Diamond";
    } else if (percentile >= 65) {
        return "Gold";
    } else if (percentile >= 45) {
        return "Silver";
    } else {
        return "Bronze";
    }
}


// Update the rank image dynamically
function displayRank(rank) {
    const rankImage = document.getElementById('rankImage');
    const rankContainer = document.getElementById('rankContainer');
    
    if (rankImage && rankContainer) {
        // Update the rank image
        rankImage.src = `./Images/${rank}.png`;
        rankImage.alt = rank;
        rankImage.style.visibility = "visible"
        // Make the rank container visible after user input
        rankContainer.style.visibility = 'visible';
    }
}

function showLogin() {
    document.getElementById('form_header').textContent = 'Login';
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('reset-password-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('form_header').textContent = 'Register';
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('reset-password-form').classList.add('hidden');
}

function showResetPassword() {
    document.getElementById('form_header').textContent = 'Reset Password';
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('reset-password-form').classList.remove('hidden');
}
// Function to search for lifters based on user input
function searchLifters(query) {
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    const suggestionsList = document.getElementById('suggestionsList');
    suggestionsList.innerHTML = ''; // Clear previous suggestions

    // Only search if the query has at least 1 character
    if (query.length < 1) {
        suggestionsContainer.style.display = 'none'; // Hide suggestions if no input
        return;
    }

    // Query the database for lifters matching the search query
    database.ref('users').orderByChild('full_name').startAt(query).endAt(query + '\uf8ff').once('value')
        .then((snapshot) => {
            const results = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                results.push(data.full_name); // Assuming 'full_name' is the field to display
            });

            // Display LOs
            if (results.length > 0) {
                suggestionsContainer.style.display = 'block'; // Show suggestions
    suggestionsContainer.classList.add('z-20'); // Ensure overlap
    results.forEach((name) => {
        const listItem = document.createElement('li');
        listItem.textContent = name;
        listItem.classList.add('p-2', 'cursor-pointer', 'hover:bg-gray-200');
        listItem.onclick = () => selectSuggestion(name); // Handle suggestion click
        suggestionsList.appendChild(listItem);
                });
            } else {
                suggestionsContainer.style.display = 'none'; // Hide if no results
            }
        })
        .catch((error) => {
            console.error('Error searching lifters:', error);
        });
}

// Function to handle selecting a suggestion
function selectSuggestion(name) {
    const searchBar = document.querySelector('.search-bar');
    searchBar.value = name; // Set the search bar value to the selected suggestion
    document.getElementById('suggestionsContainer').style.display = 'none'; // Hide suggestions
}

// Event listener for input changes in the search bar
document.querySelector('.search-bar').addEventListener('input', (event) => {
    const query = event.target.value;
    searchLifters(query); // Call search function with current input
});

// Mock function to simulate fetching users from Firebase
// Function to fetch users from Firebase and make it case-insensitive
function searchUsers(query) {
  return firebase.database().ref('/users').once('value').then(snapshot => {
      const users = [];
      snapshot.forEach(childSnapshot => {
          const userData = childSnapshot.val();
          if (userData && userData.full_name) {
              users.push(userData.full_name);
          }
      });

      // Convert both the query and the user names to lowercase for case-insensitive comparison
      const filteredUsers = users.filter(user => user.toLowerCase().includes(query.toLowerCase()));
      return filteredUsers;
  });
}

document.getElementById('searchInput').addEventListener('input', async function () {
  const query = this.value;

  if (query.length === 0) {
      document.getElementById('suggestionsContainer').style.display = 'none';
      return;
  }

  // Fetch filtered users based on non-case-sensitive query
  const results = await searchUsers(query);
  
  const suggestionsContainer = document.getElementById('suggestionsContainer');
  const suggestionsList = document.getElementById('suggestionsList');

  // Clear any previous suggestions
  suggestionsList.innerHTML = '';

  if (results.length > 0) {
      suggestionsContainer.style.display = 'block';
      
      // Populate the suggestions list
      results.forEach((user) => {
          const li = document.createElement('li');
          li.textContent = user;
          li.addEventListener('click', () => {
              // Handle user selection (e.g., filling in the input field)
              document.getElementById('searchInput').value = user;
              suggestionsContainer.style.display = 'none'; // Hide suggestions after selection
          });
          suggestionsList.appendChild(li);
      });
  } else {
      suggestionsContainer.style.display = 'none';
  }
});



document.querySelector('.search-button').addEventListener('click', function () {
    const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (searchQuery) {
        searchForUser(searchQuery);
    } else {
        alert('Please enter a name to search');
    }
});

// Function to search for users by full name (case-insensitive)
function searchForUser(query) {
    database.ref('users').once('value', function (snapshot) {
        let found = false;
        snapshot.forEach(function (childSnapshot) {
            const userId = childSnapshot.key; // Get the user's ID (userId)
            const userData = childSnapshot.val(); // Get the user's data
            console.log(userData.full_name)
            console.log(query)
            // Check if full_name exists and matches the query (case-insensitive)
            if (userData && userData.full_name && userData.full_name.toLowerCase() === query.toLowerCase()) {
                console.log(`User found: ${userData.full_name} (ID: ${userId})`);
                found = true;
              
                // Redirect to the profile page with the user ID
                window.location.href = `profile.html?userId=${userData.full_name.slice(-5)}`;
                
                // Exit the loop since we found a match
                return true;
            }
        });
        if (!found) {
            alert('No user found with that name');
        }
    });
}