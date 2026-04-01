import {db} from "../config/firebase.js";
import {v4 as uuidv4} from "uuid";

export const createFacility = async (user,body)=>{
    const id = uuidv4();
    const facility = {
        id,
        name:body.name,
        tenantId:user.tenantId,
        createdBy:user.uid,
        createdAt:Date.now()
    };
    await db.ref(`facilities/${id}`).set(facility);
    return facility;
};

export const getFacilities = async (user)=> {
    const snap = await db.ref("facilities").once("value");
    const data = snap.val() || {};
    return Object.values(data).filter(f=>f.tenantId===user.tenantId);
};