 /*function main() {
         ctx.fillStyle = "black";
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         finalEdges.forEach(line => {
             ctx.lineWidth = 20;
             ctx.strokeStyle = "purple";
             ctx.beginPath();
             ctx.moveTo(line[0].x * 3 + canvas.width / 2, line[0].y * 3 + canvas.height / 2);
             ctx.lineTo(line[1].x * 3 + canvas.width / 2, line[1].y * 3 + canvas.height / 2);
             ctx.stroke();
         });
         rooms.forEach(room => {
             if (room.main) {
                 ctx.fillStyle = "green";
             } else if (room.side) {
                 ctx.fillStyle = "cyan";
             }
             ctx.fillRect(room.min.x * 3 + canvas.width / 2, room.min.y * 3 + canvas.height / 2, (room.max.x - room.min.x) * 3, (room.max.y - room.min.y) * 3);
         });
         for (let x = 0; x < 100; x++) {
             for (let y = 0; y < 100; y++) {
                 if (tileMap[x * 100 + y] > 0) {
                     if (tileMap[x * 100 + y] === 1) {
                         ctx.fillStyle = "white";
                     } else if (tileMap[x * 100 + y] === 2) {
                         ctx.fillStyle = "grey";
                     }
                     ctx.fillRect(x * (canvas.width / 100), y * (canvas.height / 100), (canvas.width / 100), (canvas.height / 100));
                 }
             }
         }
         requestAnimationFrame(main);
     }
     requestAnimationFrame(main);*/