const PARAMETERS = {
    NUM_DAYS: 365,
    BASE_POPULATION: 1779,
    POPULATION_WITH_CARS: 1508,
    AIRSHIP_CAPACITY_KGS: 60000,
    PERSON_WEIGHT: 77,
    CAR_WEIGHT: 1848,
    AIRSHIP_TRIP_NUMBER: parseInt(process.argv[2]),
    AIRSHIP_BREAKDOWN_CHANCE: 0.025,
    CANCEL_TRIP_PEOPLE_MULTIPLIER: {
        tourism: 0.05,
        work: 0.05,
        family: 0.05,
        tourismCars: 0.05,
        workCars: 0.05,
        familyCars: 0.05
    },
    POPULATION_VARIANCE: 0.2
}
const fs = require('node:fs');

function getPercentageTravelPurpose(day) {  //the day of the year

    if (31 < day < 334) { //out of holiday season
        return {
            noCars: {
                tourism: 0.333333,
                work: 0.333333,
                family: 0.333333,
            },
            cars: {
                tourismCars: 0.333333,
                workCars: 0.333333,
                familyCars: 0.333333
            }
        }
    } else { //during holiday seasons, the number of people who are going for tourism and family increases
        return {
            noCars: {
                tourism: 0.4,
                work: .2,
                family: .4,
            },
            cars: {
                tourismCars: 0.4,
                workCars: .2,
                familyCars: .4
            }
        }
    }
}

function getRandomPopulationFluctuations() {
    let multiplier = Math.random() < 0.5 ? -1 : +1;
    return (Math.random() * PARAMETERS.POPULATION_VARIANCE * 2 * multiplier) + (1 - PARAMETERS.POPULATION_VARIANCE);
}
let travellersNoCar = {
    tourism: 0,
    work: 0,
    family: 0,
};
let travellersWithCars = {
    tourismCars: 0,
    workCars: 0,
    familyCars: 0,
};
function calculateTravellers(day) { //for both people WITH and WITHOUT cars
    let purpose = getPercentageTravelPurpose(day);

    for (let key in purpose.noCars) {
        travellersNoCar[key] += Math.floor(purpose.noCars[key] * PARAMETERS.BASE_POPULATION * getRandomPopulationFluctuations());
    }
    for (let key in purpose.cars) {
        travellersWithCars[key] += Math.floor(purpose.cars[key] * PARAMETERS.POPULATION_WITH_CARS * getRandomPopulationFluctuations());

    }
}
function badWeather(day) {
    let badWeatherProbability;
    if (day <= 31) { //JAN
        badWeatherProbability = .16
    } else if (day <= 59) { //FEB
        badWeatherProbability = .14
    } else if (day <= 90) { //MAR
        badWeatherProbability = .10
    } else if (day <= 120) { //APR
        badWeatherProbability = .14
    } else if (day <= 151) { //MAY
        badWeatherProbability = .16
    } else if (day <= 181) { //JUN
        badWeatherProbability = .16
    } else if (day <= 212) { //JLY
        badWeatherProbability = .18
    } else if (day <= 243) { //AUG
        badWeatherProbability = .15
    } else if (day <= 273) { //SEP
        badWeatherProbability = .2
    } else if (day <= 304) { //OCT
        badWeatherProbability = .18
    } else if (day <= 334) { //NOV
        badWeatherProbability = .18
    } else if (day <= 334) { //DEC
        badWeatherProbability = .12
    }
    if (Math.random() < badWeatherProbability) return true;
}

let allDayData = [];

for (let dayNo = 1; dayNo <= PARAMETERS.NUM_DAYS; dayNo++) {
    let dayData = {
        tourismLoaded: 0,
        workLoaded: 0,
        familyLoaded: 0,
        tourismCarsLoaded: 0,
        workCarsLoaded: 0,
        familyCarsLoaded: 0,
    };

    dayData.dayNo = dayNo;
    calculateTravellers(dayNo);

    function countTravellerNumbers(onFoot) { //count the total number of travellers for ALL purposes, that are left
        let totalNumber = 0;
        if (onFoot) { //calculating the people without cars
            for (let travellerPurpose in travellersNoCar) {
                totalNumber += travellersNoCar[travellerPurpose];
            }
        } else { //calculating the number of cars
            for (let travellerPurpose in travellersWithCars) {
                totalNumber += travellersWithCars[travellerPurpose];
            }
        }
        return totalNumber;
    }

    // Add the total number of people with cars and without cars to the data log
    for (let key in travellersNoCar) {
        dayData[key] = travellersNoCar[key];
    }

    for (let key in travellersWithCars) {
        dayData[key] = travellersWithCars[key];
    }

    let airshipsSent = badWeather(dayNo) ? 0 : PARAMETERS.AIRSHIP_TRIP_NUMBER;

    for (let i = 0; i < airshipsSent; i++) { //airships may break down...
        if (Math.random() < PARAMETERS.AIRSHIP_BREAKDOWN_CHANCE) {
            airshipsSent--;
        }
    }

    dayData.airshipsNumber = airshipsSent;

    let remainingAirshipCapacity = airshipsSent * PARAMETERS.AIRSHIP_CAPACITY_KGS;

    //We need to calculate the number of CARS and PEOPLE we can carry in total
    let peopleForEachCar = Math.floor(PARAMETERS.CAR_WEIGHT / PARAMETERS.PERSON_WEIGHT);
    let batchWeight = peopleForEachCar * PARAMETERS.PERSON_WEIGHT + PARAMETERS.CAR_WEIGHT;

    let lastCategoryLoaded = "family";
    let travellerPurposes = ["tourism", "work", "family"];
    function loadPerson() {  //load the next person
        let purpose
        function chooseNewPurpose() {
            if (lastCategoryLoaded == "family") {
                purpose = "tourism";
            } else {
                purpose = travellerPurposes[travellerPurposes.indexOf(lastCategoryLoaded) + 1];
            }
            if (travellersNoCar[purpose] <= 0) {
                lastCategoryLoaded = purpose;
                chooseNewPurpose()
            }
        }
        chooseNewPurpose()
        travellersNoCar[purpose]--;
        dayData[`${purpose}Loaded`]++;
        remainingAirshipCapacity -= PARAMETERS.PERSON_WEIGHT;
        lastCategoryLoaded = purpose;
    }

    let lastCategoryLoadedCars = "familyCars";
    let travellerPurposesCars = ["tourismCars", "workCars", "familyCars"];

    function loadCar() {  //load the next car
        let purpose
        function chooseNewPurpose() {
            if (lastCategoryLoadedCars == "familyCars") {
                purpose = "tourismCars";
            } else {
                purpose = travellerPurposesCars[travellerPurposesCars.indexOf(lastCategoryLoadedCars) + 1];
            }
            if (travellersWithCars[purpose] <= 0) {
                lastCategoryLoadedCars = purpose;
                chooseNewPurpose()
            }
        }
        chooseNewPurpose()
        travellersWithCars[purpose]--;
        dayData[`${purpose}Loaded`]++;
        remainingAirshipCapacity -= PARAMETERS.CAR_WEIGHT;
        lastCategoryLoadedCars = purpose;
    }

    //load a person and a car
    while (remainingAirshipCapacity > batchWeight && countTravellerNumbers(true) > 0 && countTravellerNumbers(false) > 0) {
        for (let i = 0; i < peopleForEachCar; i++) {
            if (countTravellerNumbers(true) > 0) {
                loadPerson();
            }
        }
        if (countTravellerNumbers(false) > 0) {
            loadCar();
        }
    }

    //Now we don't have a lot of airship capacity, because we have already filled them with batches of people and cars
    //Do we have capacity to load a car? If so, we keep loading cars
    while (countTravellerNumbers(false) > 0 && remainingAirshipCapacity > PARAMETERS.CAR_WEIGHT) {
        loadCar();
    }

    //Now we have either NO cars to load or not enough space to load a car. Now we load the people
    while (countTravellerNumbers(true) > 0 && remainingAirshipCapacity > PARAMETERS.PERSON_WEIGHT) {
        loadPerson();
    }

    //Are there any people we cannot carry?
    dayData.numberOfUncarriedPeople = countTravellerNumbers(true);
    dayData.numberOfUncarriedCars = countTravellerNumbers(false);


    //at the end of the day, some people will cancel their trips...
    let tripsCancelledPeople = {};
    let numberOfCancelledTripsPeople = 0;
    for (let purpose in travellersNoCar) {
        let travellersNo = Math.floor(travellersNoCar[purpose] * PARAMETERS.CANCEL_TRIP_PEOPLE_MULTIPLIER[purpose]);
        tripsCancelledPeople[purpose] = travellersNo;
        numberOfCancelledTripsPeople += travellersNo;
        travellersNoCar[purpose] -= travellersNo;
    }
    dayData.numberOfCancelledTripsPeople = numberOfCancelledTripsPeople;

    let tripsCancelledCars = {};
    let numberOfCancelledTripsCars = 0;
    for (let purpose in travellersWithCars) {
        let travellersNo = Math.floor(travellersWithCars[purpose] * PARAMETERS.CANCEL_TRIP_PEOPLE_MULTIPLIER[purpose]);
        tripsCancelledCars[purpose] = travellersNo;
        numberOfCancelledTripsCars += travellersNo;
        travellersWithCars[purpose] -= travellersNo;
    }
    dayData.numberOfCancelledTripsCars = numberOfCancelledTripsCars;

    allDayData.push(dayData);
}

//Log all of our data to a CSV file
//generate the text to log to CSV
let contentToWrite = "";
for (let key in allDayData[0]) {
    contentToWrite += `${key}, `;
}
contentToWrite += "\n"
for (let individualDay of allDayData) {
    for (let key in individualDay) {
        contentToWrite += `${individualDay[key]},`
    }
    contentToWrite += "\n"
}

fs.writeFile(`${PARAMETERS.AIRSHIP_TRIP_NUMBER} trips.csv`, contentToWrite, err => {
    if (err) {
        console.error(err);
    } else {
        console.log("File successsfully output!")
    }
});

//statistics for easy calculations
let daysWithUncarriedCars = 0;
let totalNumberCarsUncarried = 0;
allDayData.forEach(e => {
    if (e.numberOfUncarriedCars > 0) {
        totalNumberCarsUncarried += e.numberOfUncarriedCars
        daysWithUncarriedCars++
    }
})
console.log(`DAYS WHERE THERE ARE CARS NOT CARRIED: ${daysWithUncarriedCars}`);
console.log(`TOTAL NUMBER OF UNCARRIED CARS: ${totalNumberCarsUncarried} (mean per day ${Math.floor(totalNumberCarsUncarried / 365)})`);

let carTripsCancelled = 0;
allDayData.forEach(e => {
    if (e.numberOfCancelledTripsCars > 0) {
        carTripsCancelled += e.numberOfCancelledTripsCars;
    }
});
console.log(`TOTAL CAR TRIPS CANCELLED: ${carTripsCancelled}`);

let totalCarsCarried = 0;
allDayData.forEach(e => {
    totalCarsCarried += e.tourismCarsLoaded;
    totalCarsCarried += e.workCarsLoaded;
    totalCarsCarried += e.familyCarsLoaded;
})

console.log(`TOTAL CAR CARRIED: ${totalCarsCarried}`);