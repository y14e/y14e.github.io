

console.log(objectAssignDeep({ a: 1 }, { b: 2 }, { a: 3 }));
console.log(Object.assign({ a: 1 }, { b: 2 }, { a: 3 }));

console.log(objectAssignDeep({ a: 1 }, [0, 1], undefined, { b: 2 }));
console.log(Object.assign({ a: 1 }, [0, 1], undefined, { b: 2 }));

console.log(objectAssignDeep([2, 3], [0, 1], { b: 2 }));
console.log(Object.assign([2, 3], [0, 1], { b: 2 }));

console.log(objectAssignDeep([0, 1], [2, 3], { b: 2 }));
console.log(Object.assign([0, 1], [2, 3], { b: 2 }));

console.log(objectAssignDeep({}, [2, 3], { b: 2 }));
console.log(Object.assign({}, [2, 3], { b: 2 }));

console.log(objectAssignDeep({}, { a: { aa: { aaa: 1 } } }, { b: 2 }, { a: { aa: { aaa: 2 } } }, { c: 3 }, { a: { aa: { aaa: 8 } } }));
console.log(Object.assign({}, { a: { aa: { aaa: 1 } } }, { b: 2 }, { a: { aa: { aaa: 2 } } }, { c: 3 }, { a: { aa: { aaa: 8 } } }));
