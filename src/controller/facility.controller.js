import * as facilityService from "../services/facility.service.js";

export const createFacility = async(req,res) => {
    try {
        const facility = await facilityService.createFacility(req.user,req.body);
        res.json(facility);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
};

export const getFacilities = async (req,res) => {
    try {
        const data = await facilityService.getFacilities(req.user);
        res.json(data);
    } catch (error) {
        res.status(500).json({error:error.message});
    }
};
