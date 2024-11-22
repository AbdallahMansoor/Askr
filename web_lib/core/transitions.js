export class Transitions {
    static slide(element, direction = 'right') {
        const directionMap = {
            right: 'translateX(100%)',
            left: 'translateX(-100%)'
        };

        element.style.transform = directionMap[direction];
        element.style.display = 'block';

        requestAnimationFrame(() => {
            element.style.transition = 'transform 0.3s ease-out';
            element.style.transform = 'translateX(0)';
        });
    }
}