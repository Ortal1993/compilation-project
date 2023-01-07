function processAge(age: number) {
    return age;
}

let dog = {
    name: "Ben Zion",
    age: 83,
    favoriteFood: "Pizza"
};

dog["nickname"] = "Benzi";
processAge(dog.age);
