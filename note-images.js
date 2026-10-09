export async function compressNoteImage(file){
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a PNG, JPG, WebP or GIF image.');
 if(file.size>15*1024*1024)throw Error('Choose an image smaller than 15 MB.');
 const bitmap=await createImageBitmap(file);try{const canvas=document.createElement('canvas');let scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));for(let i=0;i<5;i++){canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.82);if(data.length<=350000)return {name:(file.name||'Pasted image').slice(0,120),data};scale*=.75;}throw Error('This image is too large to attach.');}finally{bitmap.close();}
}
