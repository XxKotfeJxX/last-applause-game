export const inputMap={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],interact:['KeyE'],inventory:['Tab','KeyI'],vision:['KeyQ'],journal:['KeyJ'],pause:['Escape']};
export type InputAction=keyof typeof inputMap;
export function actionFor(code:string):InputAction|undefined{return (Object.entries(inputMap) as [InputAction,string[]][]).find(([,codes])=>codes.includes(code))?.[0];}
