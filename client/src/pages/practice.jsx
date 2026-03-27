import {useState, useEffect} from "react"
import { useAuth } from "../hooks/useAuth";
import { expenseService } from "../services/expenseService";

defaultForm = {
     amount: "",
     categry: "FOOD",
     title : "",
     date: ""
}
function practice(){
    const {user, logout} = useAuth();
    const {expense, setExpense} = useState([]);
    const {form, setForm} = useState(defaultForm);
    const {aiMessage, setAimessage} = useState("");
    const {error,setError} = useState("");

    const loadexpense = async () =>{
          try{
            const data = await expenseService.getExpenses();

            setExpense(data.expense)
          }catch(RequestError){
            setError(RquestError.response?.data?.message || "error in loading expense")
          }
    }

    useEffect(()=>{
      loadexpense();
    },[])

    const handlechange = (event) =>{
        setForm((current)=>({
           ...current,
        
           [event.target.name] : [event.tartget.value]
        }))
    }
}